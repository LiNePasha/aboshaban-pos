import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api"

export const api = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WC_URL!,
  consumerKey: process.env.NEXT_PUBLIC_WC_CONSUMER_KEY!,
  consumerSecret: process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET!,
  version: "wc/v3",
})

// ===== Types =====
export type WCProduct = {
  id: number
  status: any
  name: string
  price: string
  regular_price?: string
  sale_price?: string
  images?: { src: string }[]
  categories?: { id: number; name: string }[]
  stock_quantity?: number | null
}

export type WCCategory = { id: number; name: string; parent: number }

export type WCCustomer = {
  id: number
  email?: string
  first_name?: string
  last_name?: string
  username?: string
  billing?: {
    first_name?: string
    last_name?: string
    phone?: string
    email?: string
  }
}

export type WCOrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: string;
};

export type WCOrder = {
  id: number;
  date_created: string;
  total: string;
  status: string;
  payment_method_title: string;
  line_items: WCOrderItem[];
  customer: WCCustomer;
};

// ===== Fetch Orders =====
export async function getOrders(page = 1, perPage = 20, search = "") {
  const res = await api.get("orders", { per_page: perPage, page, search });
  return {
    data: res.data as WCOrder[],
    totalPages: parseInt(res.headers["x-wp-totalpages"] ?? "1"),
  };
}

// ===== Categories =====
export async function getCategories(page = 1, perPage = 100) {
  const res = await api.get("products/categories", { per_page: perPage, page })
  return {
    data: res.data as WCCategory[],
    totalPages: parseInt(res.headers["x-wp-totalpages"] ?? "1"),
  }
}

// ===== Products =====
export async function getProducts(
  page: number = 1,
  perPage: number = 24,
  search: string = "",
  categoryId?: number
) {
  const params: Record<string, any> = { per_page: perPage, page, search }
  if (categoryId) params.category = categoryId
  const res = await api.get("products", params)
  return {
    data: res.data as WCProduct[],
    totalPages: parseInt(res.headers["x-wp-totalpages"] ?? "1"),
  }
}

// ===== Customers =====
export async function getCustomers(
  page: number = 1,
  perPage: number = 100,
  search: string = ""
) {
  const params: Record<string, any> = { per_page: perPage, page }
  if (search?.trim()) params.search = search.trim()
  const res = await api.get("customers", params)
  return {
    data: res.data as WCCustomer[],
    totalPages: parseInt(res.headers["x-wp-totalpages"] ?? "1"),
  }
}

export async function createCustomer({
  first_name,
  last_name,
  email,
  phone,
}: {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
}) {
  const payload: any = {
    email: email || undefined,
    first_name: first_name || "",
    last_name: last_name || "",
    username: email || `pos_${Date.now()}`, // WooCommerce requires unique username
    billing: {
      first_name: first_name || "",
      last_name: last_name || "",
      email: email || "",
      phone: phone || "",
    },
  }
  const res = await api.post("customers", payload)
  return res.data as WCCustomer
}

// ===== Orders (POS) =====
export async function createPOSOrder({
  items,
  cashierName,
  paymentMethod = "pos-cash",
  paymentTitle = "Cash",
  discount = 0, // final numeric discount value (after % calc if used)
  fee = 0,
  note,
  customerId,
  status = "completed",
}: {
  items: { product_id: number; quantity: number }[]
  cashierName: string
  paymentMethod?: string
  paymentTitle?: string
  discount?: number
  fee?: number
  note?: string
  customerId?: number
  status?: "pending" | "processing" | "completed" | "on-hold" | "cancelled" | "refunded"
}) {
  const payload: any = {
    payment_method: paymentMethod,
    payment_method_title: paymentTitle,
    set_paid: true,
    status,
    customer_id: customerId || undefined,
    line_items: items,
    customer_note: [
      note?.trim() ? note.trim() : null,
      `Cashier: ${cashierName}`,
    ].filter(Boolean).join(" \n"),
    fee_lines: [],
    meta_data: [{ key: "cashier_name", value: cashierName }],
  }

  if (discount && discount > 0) {
    payload.fee_lines.push({ name: "Discount", total: `-${discount}` })
  }
  if (fee && fee > 0) {
    payload.fee_lines.push({ name: "Extra Fee", total: `${fee}` })
  }

  const res = await api.post("orders", payload)
  return res.data
}
