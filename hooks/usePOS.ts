// "use client"

// import { useState, useEffect } from "react"
// import {
//   getProducts,
//   getOrders,
//   getCustomers,
//   createOrder,
//   createCustomer,
//   updateProductStock,
//   getCoupons,
//   applyCouponToOrder,
// } from "@/lib/woocommerce"

// type LineItem = { product_id: number; quantity: number; price?: string }

// export function usePOS() {
//   const [products, setProducts] = useState<any[]>([])
//   const [orders, setOrders] = useState<any[]>([])
//   const [customers, setCustomers] = useState<any[]>([])
//   const [coupons, setCoupons] = useState<any[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)

//   /**
//    * 🛍️ Load products
//    */
//   async function loadProducts(page: number = 1) {
//     try {
//       setLoading(true)
//       const res = await getProducts(page, 50)
//       setProducts(res.data)
//     } catch (err: any) {
//       setError(err.message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   /**
//    * 📦 Load orders
//    */
//   async function loadOrders(page: number = 1) {
//     try {
//       setLoading(true)
//       const res = await getOrders(page, 20)
//       setOrders(res.data)
//     } catch (err: any) {
//       setError(err.message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   /**
//    * 👤 Load customers
//    */
//   async function loadCustomers(page: number = 1) {
//     try {
//       setLoading(true)
//       const res = await getCustomers(page, 50)
//       setCustomers(res.data)
//     } catch (err: any) {
//       setError(err.message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   /**
//    * 🎟️ Load coupons
//    */
//   async function loadCoupons(page: number = 1) {
//     try {
//       setLoading(true)
//       const res = await getCoupons(page, 20)
//       setCoupons(res.data)
//     } catch (err: any) {
//       setError(err.message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   /**
//    * ➕ Create new customer
//    */
//   async function addCustomer(customer: {
//     email: string
//     first_name: string
//     last_name: string
//     phone?: string
//   }) {
//     try {
//       const res = await createCustomer(customer)
//       setCustomers((prev) => [...prev, res])
//       return res
//     } catch (err: any) {
//       setError(err.message)
//     }
//   }

//   /**
//    * 🧾 Create new order
//    */
//   async function addOrder({
//     lineItems,
//     cashierName,
//     discount = 0,
//     fee = 0,
//   }: {
//     lineItems: LineItem[]
//     cashierName: string
//     discount?: number
//     fee?: number
//   }) {
//     try {
//       const res = await createOrder({
//         lineItems,
//         cashierName,
//         discount,
//         fee,
//       })
//       setOrders((prev) => [res, ...prev])
//       return res
//     } catch (err: any) {
//       setError(err.message)
//     }
//   }

//   /**
//    * 🛠️ Update stock
//    */
//   async function updateStock(productId: number, newStock: number) {
//     try {
//       const res = await updateProductStock(productId, newStock)
//       setProducts((prev) =>
//         prev.map((p) => (p.id === productId ? res : p))
//       )
//       return res
//     } catch (err: any) {
//       setError(err.message)
//     }
//   }

//   /**
//    * 🎟️ Apply coupon to order
//    */
//   async function applyCoupon(orderId: number, couponCode: string) {
//     try {
//       const res = await applyCouponToOrder(orderId, couponCode)
//       return res
//     } catch (err: any) {
//       setError(err.message)
//     }
//   }

//   return {
//     products,
//     orders,
//     customers,
//     coupons,
//     loading,
//     error,
//     loadProducts,
//     loadOrders,
//     loadCustomers,
//     loadCoupons,
//     addCustomer,
//     addOrder,
//     updateStock,
//     applyCoupon,
//   }
// }
