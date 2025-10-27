"use client";

import React, { useEffect, useState } from "react";
import localforage from "localforage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRouter } from "next/navigation";

type Payment = {
  date: string;
  amount: number;
  note?: string;
};

type Employee = {
  id: number;
  name: string;
  salary: number;
  payments: Payment[];
};

/* ------------------- Helper ------------------- */
async function getEmployees(): Promise<Employee[]> {
  return (await localforage.getItem<Employee[]>("employees")) || [];
}

async function saveEmployees(employees: Employee[]) {
  await localforage.setItem("employees", employees);
}

function calcPaid(emp: Employee) {
  return emp.payments.reduce((sum, p) => sum + p.amount, 0);
}

/* ------------------- Page ------------------- */
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<Employee | null>(null);

  const router = useRouter();
  
    useEffect(() => {
      const loggedIn = localStorage.getItem("isLoggedIn");
      if (!loggedIn) router.push("/login");
    }, [router]);

  /* Form States */
  const [newName, setNewName] = useState("");
  const [newSalary, setNewSalary] = useState<number>(0);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    const emps = await getEmployees();
    setEmployees(emps);
    setLoading(false);
  }

  async function handleAddEmployee() {
    if (!newName.trim() || newSalary <= 0) {
      return toast.error("الاسم والمرتب مطلوبين");
    }
    const newEmp: Employee = {
      id: Date.now(),
      name: newName.trim(),
      salary: newSalary,
      payments: [],
    };
    const updated = [...employees, newEmp];
    await saveEmployees(updated);
    setEmployees(updated);
    setAddOpen(false);
    setNewName("");
    setNewSalary(0);
    toast.success("تم إضافة الموظف");
  }

  async function handleDelete(empId: number) {
    if (!confirm("هل أنت متأكد من حذف الموظف؟")) return;
    const updated = employees.filter((e) => e.id !== empId);
    await saveEmployees(updated);
    setEmployees(updated);
    toast.success("تم حذف الموظف");
  }

  async function handleAddPayment(emp: Employee) {
    if (payAmount <= 0) return toast.error("أدخل مبلغ صحيح");
    const updatedEmp = {
      ...emp,
      payments: [
        ...emp.payments,
        { date: new Date().toISOString(), amount: payAmount, note: payNote },
      ],
    };
    const updatedList = employees.map((e) =>
      e.id === emp.id ? updatedEmp : e
    );
    await saveEmployees(updatedList);
    setEmployees(updatedList);
    setDetailsOpen(updatedEmp);
    setPayAmount(0);
    setPayNote("");
    toast.success("تم إضافة صرف المرتب");
  }

  async function handleEndMonth() {
    if (!confirm("هل أنت متأكد من إنهاء الشهر؟ سيتم إعادة جميع المتبقيات إلى صفر")) return;
    const resetEmps = employees.map(emp => ({ ...emp, payments: [] }));
    await saveEmployees(resetEmps);
    setEmployees(resetEmps);
    toast.success("تم إنهاء الشهر، جميع المتبقيات أصبحت صفر");
  }

  function exportToExcel() {
    if (employees.length === 0)
      return toast.error("لا يوجد موظفين للتصدير");

    const data = employees.flatMap((emp) =>
      emp.payments.length > 0
        ? emp.payments.map((p, idx) => ({
            "اسم الموظف": emp.name,
            "المرتب الشهري": emp.salary,
            "المبلغ المصروف": p.amount,
            "المتبقي بعد الدفع": emp.salary - emp.payments
              .slice(0, idx + 1)
              .reduce((sum, x) => sum + x.amount, 0),
            "التاريخ": new Date(p.date).toLocaleString(),
            "ملاحظة": p.note || "",
          }))
        : [
            {
              "اسم الموظف": emp.name,
              "المرتب الشهري": emp.salary,
              "المبلغ المصروف": 0,
              "المتبقي بعد الدفع": emp.salary,
              "التاريخ": "",
              "ملاحظة": "",
            },
          ]
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `employees_${Date.now()}.xlsx`);
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 bg-slate-50">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h1 className="text-2xl font-bold">إدارة الموظفين</h1>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="🔍 ابحث عن موظف"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-60"
          />
          <Button onClick={() => setAddOpen(true)}>➕ إضافة موظف</Button>
          <Button onClick={exportToExcel}>📥 تصدير Excel</Button>
          <Button variant="destructive" onClick={handleEndMonth}>🗓️ إنهاء الشهر</Button>
        </div>
      </header>

      {loading ? (
        <div>جارِ تحميل البيانات...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.length === 0 && (
            <p className="text-gray-500 col-span-full">لا يوجد موظفين</p>
          )}
          {filteredEmployees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl shadow p-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold">{emp.name}</h2>
                <p>المرتب الشهري: <span className="font-medium">{emp.salary}</span></p>
                <p>تم الصرف: <span className="font-medium">{calcPaid(emp)}</span></p>
                <p>المتبقي: <span className={`font-semibold ${emp.salary - calcPaid(emp) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {emp.salary - calcPaid(emp)}
                </span></p>
              </div>
              <div className="flex justify-between mt-2 gap-2 flex-wrap">
                <Button size="sm" onClick={() => setDetailsOpen(emp)}>📋 التفاصيل</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(emp.id)}>🗑️ حذف</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">إضافة موظف جديد</h2>
            <div className="space-y-2">
              <Input
                placeholder="اسم الموظف"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="المرتب الشهري"
                value={newSalary || ""}
                onChange={(e) => setNewSalary(Number(e.target.value))}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddEmployee}>حفظ</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2">تفاصيل {detailsOpen.name}</h2>

            {/* Payments Table */}
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
                {detailsOpen.payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-gray-500">لا يوجد دفعات بعد</td>
                  </tr>
                )}
                {detailsOpen.payments.map((p, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2">{new Date(p.date).toLocaleString()}</td>
                    <td className="px-3 py-2">{p.amount}</td>
                    <td className="px-3 py-2">{p.note || "-"}</td>
                    <td className="px-3 py-2">{detailsOpen.salary - detailsOpen.payments.slice(0, idx+1).reduce((sum, x) => sum + x.amount,0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Payment Form */}
            <div className="space-y-2 border-t pt-2">
              <h3 className="font-medium">إضافة دفعة مرتب</h3>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="number"
                  placeholder="المبلغ"
                  value={payAmount || ""}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                />
                <Input
                  placeholder="ملاحظة (اختياري)"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
                <Button onClick={() => handleAddPayment(detailsOpen)} className="shrink-0">💵 حفظ</Button>
              </div>
              <div className="flex justify-end mt-2">
                <Button onClick={() => setDetailsOpen(null)} variant="outline">إغلاق</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
