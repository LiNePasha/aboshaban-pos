"use client";
import { useEffect, useState, useRef } from "react";
import {
  getLocalOrders,
  deleteLocalOrder,
  clearLocalOrders,
  LocalOrder,
} from "@/lib/localOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useRouter } from "next/navigation";

export default function LocalOrdersPage() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<LocalOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  
    useEffect(() => {
      const loggedIn = localStorage.getItem("isLoggedIn");
      if (!loggedIn) {
            router.push("/login")
        } else {
            loadOrders()
        }
    }, [router]);

  async function loadOrders() {
    const all = await getLocalOrders();
    setOrders(all.reverse());
  }

  async function handleDelete(id: string) {
    await deleteLocalOrder(id);
    toast.success("❌ تم حذف الفاتورة");
    loadOrders();
  }

  async function handleClear() {
    if (!confirm("هل أنت متأكد من مسح كل الفواتير؟")) return;
    await clearLocalOrders();
    toast.success("🧹 تم مسح كل الفواتير");
    loadOrders();
  }

  function calcTotal(order: LocalOrder) {
    const itemsTotal = order.items.reduce(
      (sum, item) => sum + item.price * (item.quantity || 1),
      0
    );
    const total = itemsTotal - (order.discount || 0) + (order.fee || 0);
    return Number(total.toFixed(2));
  }

  function exportToExcel() {
    if (orders.length === 0) return toast.error("لا توجد فواتير للتصدير");

    const data = orders.map((o) => {
      // جمع تفاصيل كل منتج
      const itemsDetails = o.items
        .map(
          (i: any) =>
            `${i.name} × ${i.quantity} × ${Number(i.price || 0).toFixed(2)}`
        )
        .join("\n"); // فصل كل منتج بسطر جديد

      return {
        "رقم الفاتورة": o.id,
        الكاشير: o.cashierName,
        "عدد العناصر": o.items.length,
        "تفاصيل المنتجات": itemsDetails, // العمود الجديد
        الخصم: o.discount,
        الرسوم: o.fee,
        الإجمالي: calcTotal(o),
        "طريقة الدفع": o.paymentTitle,
        الحالة: o.status,
        التاريخ: new Date(o.createdAt).toLocaleString(),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Local Orders");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `local_orders_${Date.now()}.xlsx`);
  }

  function exportToPDF() {
    if (orders.length === 0) return toast.error("لا توجد فواتير للتصدير");

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("📋 الفواتير المحلية", 14, 15);

    const tableData = orders.map((o) => [
      o.id.slice(0, 8),
      o.cashierName,
      o.items.length,
      calcTotal(o),
      o.paymentTitle,
      o.status,
      new Date(o.createdAt).toLocaleString(),
    ]);

    (doc as any).autoTable({
      head: [
        ["ID", "الكاشير", "العناصر", "الإجمالي", "الدفع", "الحالة", "التاريخ"],
      ],
      body: tableData,
      startY: 25,
      styles: { fontSize: 9, cellPadding: 2 },
    });

    doc.save(`local_orders_${Date.now()}.pdf`);
  }

  function handlePrint() {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة</title>
          <style>
            body { font-family: sans-serif; padding: 20px; direction: rtl; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 13px; }
            h2, p { margin: 5px 0; }
            .totals { text-align: right; margin-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const filtered = orders.filter(
    (o) =>
      o.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📋 الفواتير المحلية</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportToExcel} variant="secondary">
            📤 Excel
          </Button>
          <Button onClick={exportToPDF} variant="secondary">
            📄 PDF
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            🧹 مسح الكل
          </Button>
        </div>
      </div>

      <Input
        placeholder="ابحث برقم الفاتورة أو اسم الكاشير..."
        className="mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">لا توجد فواتير محفوظة</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const total = calcTotal(order);
            return (
              <Card key={order.id} className="shadow-sm border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-lg">
                        فاتورة رقم:{" "}
                        <span className="text-blue-600">
                          {order.id.slice(0, 8)}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        الكاشير: {order.cashierName} | التاريخ:{" "}
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        عدد العناصر: {order.items.length} | الخصم:{" "}
                        {order.discount} | الرسوم: {order.fee} |{" "}
                        <span className="font-semibold text-green-700">
                          الإجمالي: {total} ج.م
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        👁 عرض التفاصيل
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-500 border-red-300 hover:bg-red-50"
                        onClick={() => handleDelete(order.id)}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ✅ Popup التفاصيل + الطباعة */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>
                  🧾 تفاصيل الفاتورة #{selectedOrder.id.slice(0, 8)}
                </DialogTitle>
              </DialogHeader>

              {/* محتوى الطباعة */}
              <div ref={printRef} className="mt-3 space-y-2 text-sm">
                <h2>فاتورة بيع</h2>
                <p>
                  الكاشير: <b>{selectedOrder.cashierName}</b>
                </p>
                <p>
                  التاريخ: {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
                <p>طريقة الدفع: {selectedOrder.paymentTitle}</p>
                <hr className="my-2" />

                <table className="w-full border text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-1">المنتج</th>
                      <th className="border p-1">الكمية</th>
                      <th className="border p-1">السعر</th>
                      <th className="border p-1">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="border p-1">{item.name}</td>
                        <td className="border p-1 text-center">
                          {item.quantity}
                        </td>
                        <td className="border p-1 text-center">{item.price}</td>
                        <td className="border p-1 text-center">
                          {item.price * (item.quantity || 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="totals">
                  <p>الخصم: {selectedOrder.discount || 0}</p>
                  <p>الرسوم: {selectedOrder.fee || 0}</p>
                  <p className="text-green-700">
                    الإجمالي النهائي: {calcTotal(selectedOrder)} ج.م
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handlePrint}>🖨 طباعة</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
