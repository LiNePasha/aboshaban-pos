"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getOrders, WCOrder } from "@/lib/woocommerce";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<WCOrder | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const perPage = 10; // عدد الطلبات لكل صفحة

    const router = useRouter();
    
      useEffect(() => {
        const loggedIn = localStorage.getItem("isLoggedIn");
        if (!loggedIn) {
              router.push("/login")
          } else {
              loadOrders(page);
          }
      }, [router,page]);

  async function loadOrders(pageNumber: number) {
    setLoading(true);
    try {
      const { data, totalPages } = await getOrders(pageNumber, perPage, search);
      setOrders(data);
      setTotalPages(totalPages);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل الطلبات");
    }
    setLoading(false);
  }

  const filteredOrders = orders.filter(
    (o) =>
      o.customer?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toString().includes(search)
  );

  function statusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h1 className="text-2xl font-bold">🛒 الطلبات الأونلاين</h1>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="🔍 ابحث عن طلب أو عميل"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
          <Button onClick={() => loadOrders(page)}>🔄 تحديث الطلبات</Button>
        </div>
      </header>

      {/* Orders Grid */}
      {loading ? (
        <div>جارِ تحميل الطلبات...</div>
      ) : filteredOrders.length === 0 ? (
        <p className="text-gray-500">لا توجد طلبات</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow p-4 flex flex-col justify-between hover:shadow-lg transition"
            >
              <div>
                <h2 className="text-lg font-semibold">فاتورة #{order.id}</h2>
                <p>
                  العميل:{" "}
                  <span className="font-medium">
                    {order.customer?.first_name} {order.customer?.last_name}
                  </span>
                </p>
                <p>الإجمالي: <span className="font-medium">{order.total} جنيه</span></p>
                <p>
                  الحالة:{" "}
                  <span className={`px-2 py-1 rounded text-sm ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </p>
                <p>طريقة الدفع: <span className="font-medium">{order.payment_method_title}</span></p>
              </div>
              <div className="flex justify-between mt-2 gap-2 flex-wrap">
                <Button size="sm" onClick={() => setDetailsOpen(order)}>📋 التفاصيل</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <Button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
        >
          السابق
        </Button>
        <span>الصفحة {page} من {totalPages}</span>
        <Button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        >
          التالي
        </Button>
      </div>

      {/* Order Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2">
              تفاصيل الطلب #{detailsOpen.id}
            </h2>
            <p>
              العميل: {detailsOpen.customer?.first_name} {detailsOpen.customer?.last_name}
            </p>
            <p>الحالة: {detailsOpen.status}</p>
            <p>طريقة الدفع: {detailsOpen.payment_method_title}</p>
            <p>الإجمالي: {detailsOpen.total} جنيه</p>
            <p>تاريخ الطلب: {new Date(detailsOpen.date_created).toLocaleString()}</p>

            <h3 className="font-medium mt-4 mb-2">📝 المنتجات</h3>
            <table className="min-w-full text-sm text-left border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border">اسم المنتج</th>
                  <th className="px-3 py-2 border">الكمية</th>
                  <th className="px-3 py-2 border">السعر</th>
                  <th className="px-3 py-2 border">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {detailsOpen.line_items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-2 border">{item.name}</td>
                    <td className="px-3 py-2 border">{item.quantity}</td>
                    <td className="px-3 py-2 border">{item.price}</td>
                    <td className="px-3 py-2 border">{(Number(item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <Button onClick={() => setDetailsOpen(null)} variant="outline">
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
