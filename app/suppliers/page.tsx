"use client";

import React, { useEffect, useState } from "react";
import localforage from "localforage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRouter } from "next/navigation";

type Transaction = {
  date: string;
  amount: number;
  note?: string;
};

type Supplier = {
  id: number;
  name: string;
  balance: number;
  transactions: Transaction[];
};

/* ------------------- Helper ------------------- */
async function getSuppliers(): Promise<Supplier[]> {
  const data = (await localforage.getItem<Supplier[]>("suppliers")) || [];
  return data.map((s) => ({ ...s, transactions: s.transactions || [] }));
}

async function saveSuppliers(suppliers: Supplier[]) {
  await localforage.setItem("suppliers", suppliers);
}

function calcPaid(sup: Supplier) {
  return (sup.transactions || []).reduce((sum, t) => sum + t.amount, 0);
}

/* ------------------- Page ------------------- */
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [transAmount, setTransAmount] = useState<number>(0);
  const [transNote, setTransNote] = useState("");

  const [newName, setNewName] = useState("");
  const [newBalance, setNewBalance] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn");
    if (!loggedIn) {
      router.push("/login");
    } else {
      loadSuppliers();
    }
  }, [router]);

  async function loadSuppliers() {
    setLoading(true);
    const data = await getSuppliers();
    setSuppliers(data);
    setLoading(false);
  }

  async function handleAddSupplier() {
    if (!newName.trim() || newBalance <= 0)
      return toast.error("الاسم والرصيد مطلوبين");
    const newSup: Supplier = {
      id: Date.now(),
      name: newName.trim(),
      balance: newBalance,
      transactions: [],
    };
    const updated = [...suppliers, newSup];
    await saveSuppliers(updated);
    setSuppliers(updated);
    setAddOpen(false);
    setNewName("");
    setNewBalance(0);
    toast.success("تم إضافة المورد");
  }

  async function handleDelete(supId: number) {
    if (!confirm("هل أنت متأكد من حذف المورد؟")) return;
    const updated = suppliers.filter((s) => s.id !== supId);
    await saveSuppliers(updated);
    setSuppliers(updated);
    toast.success("تم حذف المورد");
  }

  async function handleAddTransaction(sup: Supplier) {
    if (transAmount === 0) return toast.error("أدخل مبلغ صحيح");
    const updatedSup = {
      ...sup,
      transactions: [
        ...sup.transactions,
        {
          date: new Date().toISOString(),
          amount: transAmount,
          note: transNote,
        },
      ],
    };
    const updatedList = suppliers.map((s) =>
      s.id === sup.id ? updatedSup : s
    );
    await saveSuppliers(updatedList);
    setSuppliers(updatedList);
    setDetailsOpen(updatedSup);
    setTransAmount(0);
    setTransNote("");
    toast.success("تم إضافة المعاملة");
  }

  async function handleEndMonth() {
    if (!confirm("هل تريد إعادة ضبط المعاملات لكل الموردين لنهاية الشهر؟"))
      return;
    const reset = suppliers.map((s) => ({ ...s, transactions: [] }));
    await saveSuppliers(reset);
    setSuppliers(reset);
    toast.success("تم إنهاء الشهر، جميع المتبقيات أصبحت صفر");
  }

  function exportToExcel() {
    if (suppliers.length === 0) return toast.error("لا يوجد موردين للتصدير");
    const data = suppliers.flatMap((s) =>
      s.transactions.length > 0
        ? s.transactions.map((t, idx) => ({
            "اسم المورد": s.name,
            "الرصيد الكلي": s.balance,
            "المبلغ المدفوع": t.amount,
            "المتبقي بعد الدفع":
              s.balance -
              s.transactions
                .slice(0, idx + 1)
                .reduce((sum, x) => sum + x.amount, 0),
            التاريخ: new Date(t.date).toLocaleString(),
            ملاحظة: t.note || "",
          }))
        : [
            {
              "اسم المورد": s.name,
              "الرصيد الكلي": s.balance,
              "المبلغ المدفوع": 0,
              "المتبقي بعد الدفع": s.balance,
              التاريخ: "",
              ملاحظة: "",
            },
          ]
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
    const blob = new Blob(
      [XLSX.write(wb, { bookType: "xlsx", type: "array" })],
      { type: "application/octet-stream" }
    );
    saveAs(blob, `suppliers_${Date.now()}.xlsx`);
  }

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="🔍 ابحث عن مورد"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
          <Button onClick={() => setAddOpen(true)}>➕ إضافة مورد</Button>
          <Button onClick={exportToExcel}>📥 تصدير Excel</Button>
          <Button variant="destructive" onClick={handleEndMonth}>
            🗓️ إنهاء الشهر
          </Button>
        </div>
      </header>

      {loading ? (
        <div>جارِ تحميل البيانات...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.length === 0 && (
            <p className="text-gray-500 col-span-full">لا يوجد موردين</p>
          )}
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white rounded-xl shadow p-4 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold">{sup.name}</h2>
                <p>
                  الرصيد الكلي:{" "}
                  <span className="font-medium">{sup.balance}</span>
                </p>
                <p>
                  تم الدفع: <span className="font-medium">{calcPaid(sup)}</span>
                </p>
                <p>
                  المتبقي:{" "}
                  <span
                    className={`font-semibold ${
                      sup.balance - calcPaid(sup) > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {sup.balance - calcPaid(sup)}
                  </span>
                </p>
              </div>
              <div className="flex justify-between mt-2 gap-2 flex-wrap">
                <Button size="sm" onClick={() => setDetailsOpen(sup)}>
                  📋 التفاصيل
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(sup.id)}
                >
                  🗑️ حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">إضافة مورد جديد</h2>
            <div className="space-y-2">
              <Input
                placeholder="اسم المورد"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="الرصيد الكلي"
                value={newBalance || ""}
                onChange={(e) => setNewBalance(Number(e.target.value))}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddSupplier}>حفظ</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2">
              تفاصيل {detailsOpen.name}
            </h2>

            {/* Transactions Table */}
            <table className="min-w-full text-sm text-left mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2">التاريخ</th>
                  <th className="px-3 py-2">المبلغ</th>
                  <th className="px-3 py-2">الملاحظة</th>
                  <th className="px-3 py-2">المتبقي بعد الدفع</th>
                </tr>
              </thead>
              <tbody>
                {detailsOpen.transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-gray-500">
                      لا توجد معاملات بعد
                    </td>
                  </tr>
                )}
                {detailsOpen.transactions.map((t, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2">
                      {new Date(t.date).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{t.amount}</td>
                    <td className="px-3 py-2">{t.note || "-"}</td>
                    <td className="px-3 py-2">
                      {detailsOpen.balance -
                        detailsOpen.transactions
                          .slice(0, idx + 1)
                          .reduce((sum, x) => sum + x.amount, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Transaction Form */}
            <div className="space-y-2 border-t pt-2">
              <h3 className="font-medium">إضافة دفعة / خصم</h3>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="number"
                  placeholder="المبلغ (+ دفع / - خصم)"
                  value={transAmount || ""}
                  onChange={(e) => setTransAmount(Number(e.target.value))}
                />
                <Input
                  placeholder="ملاحظة (اختياري)"
                  value={transNote}
                  onChange={(e) => setTransNote(e.target.value)}
                />
                <Button
                  onClick={() => handleAddTransaction(detailsOpen)}
                  className="shrink-0"
                >
                  💰 حفظ
                </Button>
              </div>
              <div className="flex justify-end mt-2">
                <Button onClick={() => setDetailsOpen(null)} variant="outline">
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
