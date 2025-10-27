export function printReceipt({ items, total, discount, fee, cashier, customer }: any) {
  const win = window.open("", "_blank")
  if (!win) return
  win.document.write(`
    <pre style="font-family: monospace; font-size: 12px">
      *** STORE NAME ***
      Cashier: ${cashier}
      Customer: ${customer}

      ${items.map((i: any) => `${i.name} x${i.qty} = ${i.total}`).join("\n")}

      Discount: ${discount}
      Fee: ${fee}
      ---------------------
      TOTAL: ${total}
    </pre>
  `)
  win.print()
  win.close()
}
