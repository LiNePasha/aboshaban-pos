import localforage from "localforage"
import { v4 as uuidv4 } from "uuid"

export interface LocalOrder {
  id: string
  items: { product_id: number; quantity: number, price:number, name:any }[]
  cashierName: string
  paymentMethod: string
  paymentTitle: string
  discount: number
  fee: number
  note?: string
  customerId?: number
  status: string
  createdAt: string
}

// إعداد التخزين المحلي
localforage.config({
  name: "POSApp",
  storeName: "orders",
})

// ✅ حفظ فاتورة جديدة
export async function addLocalOrder(order: Omit<LocalOrder, "id" | "createdAt">) {
  const id = uuidv4()
  const createdAt = new Date().toISOString()
  const fullOrder: LocalOrder = { id, createdAt, ...order }

  const all = (await localforage.getItem<LocalOrder[]>("orders")) || []
  all.push(fullOrder)
  await localforage.setItem("orders", all)

  return fullOrder
}

// 🧾 استرجاع كل الفواتير
export async function getLocalOrders(): Promise<LocalOrder[]> {
  return (await localforage.getItem<LocalOrder[]>("orders")) || []
}

// ❌ حذف فاتورة واحدة
export async function deleteLocalOrder(id: string) {
  const all = (await getLocalOrders()).filter(o => o.id !== id)
  await localforage.setItem("orders", all)
}

// ⚠️ مسح الكل
export async function clearLocalOrders() {
  await localforage.removeItem("orders")
}
