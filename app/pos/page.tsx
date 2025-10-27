"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getProducts,
  getCategories,
  getCustomers,
  createCustomer,
  createPOSOrder,
  WCProduct,
  WCCategory,
  WCCustomer,
  api,
} from "@/lib/woocommerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { addLocalOrder } from "@/lib/localOrders";
import AdvancedCustomerSelect from "@/components/AdvancedCustomerSelect";
import { useRouter } from "next/navigation";

/* --------------------
  Helpers
---------------------*/
function formatEGP(v: number) {
  return v.toFixed(0) + " جنيه";
}

const CASHIERS = ["أحمد", "سارة", "محمود", "منة", "كريم"];

/* Simple Modal */
function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

/* --------------------
  POS Page
---------------------*/
export default function POSPage() {
  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn");
    if (!loggedIn) router.push("/login");
  }, [router]);

  // data
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [categories, setCategories] = useState<WCCategory[]>([]);
  const [customers, setCustomers] = useState<WCCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState<number | "">("");
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<number | "all">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [perPage] = useState(36);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // customer selection
  const [customerId, setCustomerId] = useState<number | "none" | null>("none");
  // const selectedCustomer = useMemo(
  //   () => customers.find(c => c.id === customerId),
  //   [customers, customerId]
  // )
  const [customerSearch, setCustomerSearch] = useState("");

  // add new customer modal
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [newCustFirst, setNewCustFirst] = useState("");
  const [newCustLast, setNewCustLast] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // cart & checkout
  const [cart, setCart] = useState<{ product: WCProduct; qty: number }[]>([]);
  const [cashierName, setCashierName] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">(
    "fixed"
  );
  const [fee, setFee] = useState<number>(0);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [orderStatus, setOrderStatus] = useState<"processing" | "completed">(
    "completed"
  );

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // UI + misc
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const cashierRef = useRef<HTMLSelectElement | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts(1);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  useEffect(() => {
    loadProducts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    loadCategories();
    loadCustomers();
    // keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (key === "c") {
        e.preventDefault();
        cashierRef.current?.focus();
      }
      if (key === "p") {
        e.preventDefault();
        doPrint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadCategories() {
    try {
      const res = await getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل التصنيفات");
    }
  }

  async function loadProducts(requestPage = 1) {
    try {
      setProductsLoading(true);
      const cat = selectedCategory === "all" ? undefined : selectedCategory;
      const res = await getProducts(requestPage, perPage, search, cat as any);
      setProducts(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل المنتجات");
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadCustomers(requestPage = 1, q = "") {
    try {
      const res = await getCustomers(requestPage, 100, q);
      setCustomers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل العملاء");
    }
  }

  /* --------------------
     Cart functions
  ---------------------*/
  function addToCart(product: WCProduct) {
    setCart((prev) => {
      const found = prev.find((p) => p.product.id === product.id);
      if (found)
        return prev.map((p) =>
          p.product.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      return [{ product, qty: 1 }, ...prev];
    });
  }

  function updateQty(productId: number, qty: number) {
    if (qty <= 0) return removeFromCart(productId);
    setCart((prev) =>
      prev.map((p) => (p.product.id === productId ? { ...p, qty } : p))
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((p) => p.product.id !== productId));
  }

  /* --------------------
     Totals & Validation
  ---------------------*/
  const subtotal = useMemo(
    () =>
      cart.reduce((s, i) => s + parseFloat(i.product.price || "0") * i.qty, 0),
    [cart]
  );

  const computedDiscount = useMemo(() => {
    const d = Number(discount || 0);
    if (discountType === "percent") {
      const pct = Math.min(Math.max(d, 0), 100);
      return (subtotal * pct) / 100;
    }
    // fixed
    return d;
  }, [discount, discountType, subtotal]);

  const safeDiscount = Math.max(0, Math.min(computedDiscount, subtotal));
  const safeFee = Math.max(0, fee || 0);
  const grandTotal = Math.max(0, subtotal - safeDiscount + safeFee);

  const validationMessages = useMemo(() => {
    const msgs: string[] = [];
    if (cart.length === 0) msgs.push("🟠 أضف منتجات للسلة");
    if (!cashierName?.trim()) msgs.push("🟠 اختر اسم الكاشير");
    if (discount < 0) msgs.push("🔴 الخصم لازم يكون رقم موجب");
    if (discountType === "percent" && (discount < 0 || discount > 100))
      msgs.push("🔴 نسبة الخصم بين 0% و 100%");
    if (fee < 0) msgs.push("🔴 الرسوم لازم تكون رقم موجب");
    if (safeDiscount > subtotal) msgs.push("🔴 الخصم أكبر من الإجمالي");
    return msgs;
  }, [cart, cashierName, discount, discountType, fee, subtotal, safeDiscount]);

  const canCheckout = validationMessages.length === 0 && !loading;

  /* --------------------
     Checkout (with confirm)
  ---------------------*/
  async function handleConfirmCheckout() {
    setConfirmOpen(true);
  }

  async function checkout() {
    setLoading(true);
    try {
      const items = cart.map((c) => ({
        product_id: c.product.id,
        quantity: c.qty,
        price: Number(c.product.price || 0),
        name: c.product.name,
      }));

      // ✅ حفظ الفاتورة محليًا فقط
      const localOrder = await addLocalOrder({
        items,
        cashierName: cashierName.trim(),
        discount: safeDiscount,
        fee: safeFee,
        note: note?.trim(),
        paymentMethod: paymentMethod === "cash" ? "pos-cash" : "pos-card",
        paymentTitle: paymentMethod === "cash" ? "كاش" : "محفظة",
        customerId: typeof customerId === "number" ? customerId : undefined,
        status: "completed",
      });

      setInvoice(localOrder);
      setConfirmOpen(false);
      toast.success(`✅ تم إنشاء الفاتورة المحلية #${localOrder.id}`);

      setCart([]);
      setDiscount(0);
      setFee(0);
      setNote("");
      setDiscountType("fixed");
      searchRef.current?.focus();
    } catch (err) {
      console.error(err);
      toast.error("فشل إنشاء الفاتورة المحلية");
    } finally {
      setLoading(false);
    }
  }

  /* --------------------
     Print receipt
  ---------------------*/
  function doPrint() {
    if (!invoice || !receiptRef.current) {
      window.print();
      return;
    }
    const printContents = receiptRef.current.innerHTML;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة #${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            .header { text-align: center; margin-bottom: 8px; }
            .items { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .items td, .items th { padding: 6px 4px; border-bottom: 1px solid #ddd; }
            .total { font-weight: bold; margin-top: 8px; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 500);
  }

  /* --------------------
     UI subcomponents
  ---------------------*/
function ProductCard({ p }: { p: WCProduct }) {
  const [status, setStatus] = useState(p.status || "publish"); // publish = متوفر, draft = غير متوفر

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    try {
      const updated = await api.put(`products/${p.id}`, {
        status: newStatus,
      });
      setStatus(updated.data.status);
      loadProducts(page); // إعادة تحميل المنتجات لتحديث الحالة
      toast.success(
        `تم تغيير حالة المنتج إلى: ${
          updated.data.status === "publish" ? "متوفر" : "غير متوفر"
        }`
      );
    } catch (err) {
      console.error(err);
      toast.error("فشل تغيير الحالة");
    }
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`${p.status !== "publish" ? "opacity-50" : "cursor-pointer"}`}>
      <Card className="p-2 h-full flex flex-col justify-between">
        <CardContent className="p-2">
          <div onClick={p.status === "publish" ? () => addToCart(p) : undefined} className="h-28 flex items-center justify-center bg-white rounded">
            <img
              src={p.images?.[0]?.src || "/placeholder.png"}
              alt={p.name}
              className="max-h-24 object-contain"
            />
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-center">
              <div onClick={p.status === "publish" ? () => addToCart(p) : undefined} className="text-sm font-medium line-clamp-2">{p.name}</div>
              <select
                className={`px-2 py-1 text-xs rounded border ${
                  status === "publish"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
                value={status}
                onChange={handleStatusChange}
              >
                <option value="publish">متوفر</option>
                <option value="draft">غير متوفر</option>
              </select>
            </div>
            <div className="text-sm text-green-700 font-semibold mt-1">
              {formatEGP(Number(p.price || 0))}
            </div>
            {p.categories?.length ? (
              <div className="text-xs text-gray-400 mt-1">{p.categories[0].name}</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

  /* --------------------
     Render
  ---------------------*/
  return (
    <div className="min-h-screen p-4 bg-slate-50">
      <div className="mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">نقطة البيع (POS)</h1>
          <div className="text-sm text-gray-500">
            اختصارات: <strong>S</strong>=بحث · <strong>C</strong>=كاشير ·{" "}
            <strong>P</strong>=طباعة
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Products area */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Input
                ref={searchRef}
                placeholder="بحث باسم المنتج أو SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="border rounded p-2 bg-white"
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
              >
                <option value="all">كل التصنيفات</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex gap-2">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  تصفية
                </button>
                <div className="px-3 py-1 bg-white rounded shadow text-sm">
                  {products.length} منتج
                </div>
              </div>
            </div>

            <div className="bg-white rounded p-3 min-h-[60vh]">
              {productsLoading ? (
                <div className="py-12 text-center text-gray-500">
                  جارِ تحميل المنتجات...
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  لا توجد منتجات
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Button
                    className="mb-4"
                    onClick={() => setAddProductOpen(true)}
                  >
                    ➕ إضافة منتج جديد
                  </Button>

                  <Modal
                    open={addProductOpen}
                    onClose={() => setAddProductOpen(false)}
                    title="إضافة منتج جديد"
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm block mb-1">اسم المنتج</label>
                        <Input
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="مثال: خوذة جديدة"
                        />
                      </div>
                      <div>
                        <label className="text-sm block mb-1">السعر</label>
                        <Input
                          type="number"
                          value={newProdPrice}
                          onChange={(e) =>
                            setNewProdPrice(Number(e.target.value))
                          }
                          placeholder="مثال: 250"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAddProductOpen(false)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!newProdName.trim() || !newProdPrice) {
                              toast.error("اكتب الاسم والسعر");
                              return;
                            }
                            try {
                              setCreatingProduct(true);
                              const product = await api.post("products", {
                                name: newProdName,
                                regular_price: newProdPrice.toString(),
                                status: "publish", // متوفر تلقائيًا
                              });
                              toast.success("تم إضافة المنتج بنجاح");
                              setNewProdName("");
                              setNewProdPrice("");
                              setAddProductOpen(false);
                              loadProducts(1); // تحديث القائمة
                            } catch (err) {
                              console.error(err);
                              toast.error("فشل إضافة المنتج");
                            } finally {
                              setCreatingProduct(false);
                            }
                          }}
                          disabled={creatingProduct}
                        >
                          {creatingProduct ? "جارٍ الحفظ..." : "حفظ"}
                        </Button>
                      </div>
                    </div>
                  </Modal>

                  {products.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>
              )}
            </div>

            {/* pagination */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setPage((s) => Math.max(1, s - 1))}
              >
                ‹ السابق
              </button>
              <div className="px-3 py-1 bg-white rounded shadow">
                صفحة {page} / {totalPages}
              </div>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setPage((s) => Math.min(totalPages, s + 1))}
              >
                التالي ›
              </button>
            </div>
          </div>

          {/* Sticky Cart / Checkout */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded p-4 shadow flex flex-col">
              {/* Customer + Cashier */}
              <div className="grid gap-3 mb-3">
                <AdvancedCustomerSelect
                  initialCustomers={customers} // العملاء الجاهزين عندك من الذاكرة
                  value={customerId} // القيمة المختارة حاليًا
                  onChange={(val) => setCustomerId(val)} // تحديث الـ id لما يختار عميل
                  onSelectedCustomer={(c) => {
                    // ✅ هنا نحدّث الـ selectedCustomer اللي عندك أنت
                    if (!c) {
                      setCustomerId("none");
                      setSelectedCustomer(undefined);
                    } else {
                      setCustomerId(c.id);
                      setSelectedCustomer(c);
                    }
                  }}
                  loadCustomers={async (_page = 1, q = "") => {
                    // ✅ نبحث محليًا في العملاء اللي عندك بدل API
                    if (!q) return customers;
                    return customers.filter((c) => {
                      const name = `${
                        c.first_name || c.billing?.first_name || ""
                      } ${
                        c.last_name || c.billing?.last_name || ""
                      }`.toLowerCase();
                      const phone = c.billing?.phone?.toLowerCase() || "";
                      const email = c.email?.toLowerCase() || "";
                      return (
                        name.includes(q.toLowerCase()) ||
                        phone.includes(q.toLowerCase()) ||
                        email.includes(q.toLowerCase())
                      );
                    });
                  }}
                  openAddCustomerModal={() => setAddCustOpen(true)}
                />

                {/* ✅ تفاصيل العميل المختار */}
                {selectedCustomer ? (
                  <div className="text-xs text-gray-600 mt-2">
                    المختار:{" "}
                    {(selectedCustomer.first_name ||
                      selectedCustomer.billing?.first_name ||
                      "") +
                      " " +
                      (selectedCustomer.last_name ||
                        selectedCustomer.billing?.last_name ||
                        "")}
                    {selectedCustomer.billing?.phone
                      ? ` — ${selectedCustomer.billing?.phone}`
                      : ""}
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <label className="text-sm font-medium">الكاشير</label>
                  <select
                    ref={cashierRef}
                    className="border rounded p-2 bg-white"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                  >
                    <option value="">— اختر الكاشير —</option>
                    {CASHIERS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cart */}
<div className="mb-3">
  <h2 className="text-lg font-semibold mb-2">🛒 السلة</h2>
  {cart.length === 0 ? (
    <p className="text-gray-500">السلة فاضية - أضف منتجات</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 rounded">
        <thead className="bg-gray-100 text-sm text-gray-600">
          <tr>
            <th className="py-2 px-3 text-right">المنتج</th>
            <th className="py-2 px-3 text-right">السعر</th>
            <th className="py-2 px-3 text-center">الكمية</th>
            <th className="py-2 px-3 text-right">المجموع</th>
            <th className="py-2 px-3 text-center">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item) => (
            <tr key={item.product.id} className="text-sm border-b last:border-b-0">
              <td className="py-2 px-3">{item.product.name}</td>
              <td className="py-2 px-3 text-right">{formatEGP(Number(item.product.price || 0))}</td>
              <td className="py-2 px-3 text-center flex items-center justify-center gap-1">
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => updateQty(item.product.id, item.qty - 1)}
                >
                  -
                </button>
                <span className="px-2">{item.qty}</span>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => updateQty(item.product.id, item.qty + 1)}
                >
                  +
                </button>
              </td>
              <td className="py-2 px-3 text-right font-semibold">
                {formatEGP(Number(item.product.price || 0) * item.qty)}
              </td>
              <td className="py-2 px-3 text-center">
                <button
                  className="text-sm text-red-600"
                  onClick={() => removeFromCart(item.product.id)}
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

              {/* Discount / Fee / Note / Payment */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-sm font-medium block mb-1">
                      نوع الخصم
                    </label>
                    <select
                      className="w-full border rounded p-2 bg-white"
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as "fixed" | "percent")
                      }
                    >
                      <option value="fixed">مبلغ</option>
                      <option value="percent">نسبة %</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="text-sm font-medium block mb-1">
                      قيمة الخصم
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={discountType === "percent" ? 100 : undefined}
                      placeholder={
                        discountType === "percent"
                          ? "مثال: 10 (٪)"
                          : "مثال: 50 EGP"
                      }
                      value={discount}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        if (v < 0) {
                          toast.error("الخصم لازم يكون موجب");
                          return;
                        }
                        if (discountType === "percent" && v > 100) {
                          toast.warning("الحد الأقصى 100%");
                          setDiscount(100);
                          return;
                        }
                        setDiscount(v);
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-sm font-medium block mb-1">
                      رسوم إضافية
                    </label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="رسوم (EGP)"
                      value={fee}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        if (v < 0) {
                          toast.error("الرسوم لازم تكون موجبة");
                          return;
                        }
                        setFee(v);
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      وسيلة الدفع
                    </label>
                    <div className="flex items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentMethod === "cash"}
                          onChange={() => setPaymentMethod("cash")}
                        />{" "}
                        نقدي
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentMethod === "card"}
                          onChange={() => setPaymentMethod("card")}
                        />{" "}
                        بطاقة
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      حالة الطلب
                    </label>
                    <select
                      className="w-full border rounded p-2 bg-white"
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value as any)}
                    >
                      <option value="processing">قيد المعالجة</option>
                      <option value="completed">مكتمل</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    ملاحظة (اختياري)
                  </label>
                  <Input
                    placeholder="اكتب ملاحظة"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Validation summary */}
              <div className="my-3">
                {validationMessages.length > 0 ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">
                    <div className="font-semibold">مطلوب:</div>
                    <ul className="list-disc list-inside">
                      {validationMessages.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded text-sm">
                    ✔️ جاهز للدفع — راجع الإجمالي ثم اضغط تأكيد
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <div>المجموع</div>
                  <div>{formatEGP(subtotal)}</div>
                </div>
                <div className="flex justify-between text-red-600">
                  <div>
                    خصم{" "}
                    {discountType === "percent" ? `(${discount || 0}%)` : ""}
                  </div>
                  <div>-{formatEGP(safeDiscount)}</div>
                </div>
                <div className="flex justify-between text-blue-600">
                  <div>رسوم</div>
                  <div>+{formatEGP(safeFee)}</div>
                </div>
                <div className="flex justify-between font-semibold mt-2 text-lg">
                  <div>الإجمالي</div>
                  <div>{formatEGP(grandTotal)}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Button
                  className="flex-1"
                  onClick={
                    canCheckout
                      ? handleConfirmCheckout
                      : () => validationMessages.forEach((m) => toast.error(m))
                  }
                  disabled={!canCheckout}
                >
                  {loading ? "⏳ جارِ المعالجة..." : "💳 تأكيد الدفع"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCart([]);
                    setDiscount(0);
                    setFee(0);
                    setNote("");
                    setDiscountType("fixed");
                  }}
                >
                  مسح
                </Button>
              </div>

              {/* Invoice snippet */}
              {invoice && (
                <div className="mt-3 border rounded p-2 bg-green-50">
                  <div className="flex justify-between items-center">
                    <div>✅ الطلب #{invoice.id}</div>
                    <div>
                      <button className="text-sm underline" onClick={doPrint}>
                        طباعة
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    الإجمالي: {invoice.total}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* hidden receipt */}
        <div style={{ display: "none" }}>
          <div ref={receiptRef} id="receipt-content" className="p-4">
            {invoice ? (
              <>
                <div className="header">
                  <h2>اسم المتجر</h2>
                  <div>طلب #{invoice.id}</div>
                </div>
                <table
                  className="items"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <tbody>
                    {invoice.line_items?.map((li: any) => (
                      <tr key={li.id}>
                        <td>{li.name}</td>
                        <td style={{ textAlign: "left" }}>
                          {li.quantity} × {formatEGP(Number(li.price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total">الإجمالي: {invoice.total}</div>
                <div>
                  الكاشير:{" "}
                  {invoice.meta_data?.find((m: any) => m.key === "cashier_name")
                    ?.value || ""}
                </div>
                {selectedCustomer ? (
                  <div>
                    العميل:{" "}
                    {selectedCustomer.first_name ||
                      selectedCustomer.billing?.first_name ||
                      ""}{" "}
                    {selectedCustomer.last_name ||
                      selectedCustomer.billing?.last_name ||
                      ""}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="تأكيد إنشاء الفاتورة"
      >
        <div className="space-y-3 text-sm">
          <div>
            عدد العناصر: <strong>{cart.length}</strong>
          </div>
          <div>
            الإجمالي المستحق: <strong>{formatEGP(grandTotal)}</strong>
          </div>
          {selectedCustomer ? (
            <div>
              العميل:{" "}
              <strong>
                {selectedCustomer.first_name ||
                  selectedCustomer.billing?.first_name ||
                  ""}{" "}
                {selectedCustomer.last_name ||
                  selectedCustomer.billing?.last_name ||
                  ""}
              </strong>
            </div>
          ) : (
            <div>بدون عميل</div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={checkout} disabled={loading}>
              {loading ? "جارٍ الإنشاء..." : "تأكيد"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        open={addCustOpen}
        onClose={() => setAddCustOpen(false)}
        title="إضافة عميل جديد"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm block mb-1">الاسم الأول</label>
              <Input
                value={newCustFirst}
                onChange={(e) => setNewCustFirst(e.target.value)}
                placeholder="مثال: محمد"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">الاسم الأخير</label>
              <Input
                value={newCustLast}
                onChange={(e) => setNewCustLast(e.target.value)}
                placeholder="مثال: علي"
              />
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">الإيميل (اختياري)</label>
            <Input
              type="email"
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="text-sm block mb-1">رقم الموبايل (اختياري)</label>
            <Input
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddCustOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                if (!newCustFirst.trim()) {
                  toast.error("اكتب الاسم الأول");
                  return;
                }
                try {
                  setCreatingCustomer(true);
                  const cust = await createCustomer({
                    first_name: newCustFirst.trim(),
                    last_name: newCustLast.trim(),
                    email:
                      newCustEmail.trim() ||
                      `customer_${Date.now()}@example.com`,
                    phone: newCustPhone.trim() || undefined,
                  });
                  toast.success("تم إضافة العميل");
                  // refresh list + select new customer
                  await loadCustomers(1, "");
                  setCustomerId(cust.id);
                  setAddCustOpen(false);
                  // reset form
                  setNewCustFirst("");
                  setNewCustLast("");
                  setNewCustEmail("");
                  setNewCustPhone("");
                } catch (e) {
                  console.error(e);
                  toast.error("فشل إضافة العميل");
                } finally {
                  setCreatingCustomer(false);
                }
              }}
              disabled={creatingCustomer}
            >
              {creatingCustomer ? "جارِ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
