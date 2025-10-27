// import { AppSidebar } from "@/components/app-sidebar";
// import { OrdersTable } from "@/components/data-table";
// import { getOrders } from "@/lib/woocommerce"
// import { SiteHeader } from "@/components/site-header";
// import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";


// export default async function Page() {
//   const orders = await getOrders()

//   const mappedOrders = orders.map((order: any) => ({
//     id: order.id,
//     status: order.status,
//     total: order.total,
//     date_created: order.date_created,
//     payment_method: order.payment_method_title,
//     customer_id: order.customer_id,
//   }))
//   return (
//     <SidebarProvider
//       style={
//         {
//           "--sidebar-width": "calc(var(--spacing) * 72)",
//           "--header-height": "calc(var(--spacing) * 12)",
//         } as React.CSSProperties
//       }
//     >
//       <AppSidebar variant="inset" />
//       <SidebarInset>
//         <SiteHeader />
//         <div className="flex flex-1 flex-col">
//           <div className="@container/main flex flex-1 flex-col gap-2">
//             <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
//                <OrdersTable data={mappedOrders} />
//             </div>
//           </div>
//         </div>
//       </SidebarInset>
//     </SidebarProvider>
//   );
// }


// // import { ChartAreaInteractive } from "@/components/chart-area-orders";
// {/* <div className="px-4 lg:px-6">
//                 <ChartAreaInteractive />
//               </div> */}
