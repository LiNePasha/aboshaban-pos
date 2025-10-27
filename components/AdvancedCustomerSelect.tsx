// components/AdvancedCustomerSelect.tsx
"use client"
import React, { useEffect, useRef, useState } from "react"

export type WC_Customer = {
  id: number
  first_name?: string
  last_name?: string
  email?: string
  billing?: { first_name?: string; last_name?: string; phone?: string }
}

type Props = {
  initialCustomers?: WC_Customer[] // optional preload
  value?: number | "none" | null
  onChange?: (val: number | "none" | null) => void
  onSelectedCustomer?: (c: WC_Customer | null) => void
  loadCustomers?: (page?: number, query?: string) => Promise<WC_Customer[]> // optional hook to call your API
  openAddCustomerModal?: () => void
  placeholder?: string
}

function useDebounce<T>(value: T, delay = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export default function AdvancedCustomerSelect({
  initialCustomers = [],
  value = null,
  onChange,
  onSelectedCustomer,
  loadCustomers,
  openAddCustomerModal,
  placeholder = "بحث عن عميل بالاسم/الإيميل/الموبايل",
}: Props) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = useState<WC_Customer[]>(initialCustomers)
  const [isOpen, setIsOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [selected, setSelected] = useState<WC_Customer | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    // if value provided (id), try select from initialCustomers
    if (value && value !== "none") {
      const found = initialCustomers.find((c) => c.id === value)
      if (found) {
        setSelected(found)
        onSelectedCustomer?.(found)
      }
    } else if (value === "none") {
      setSelected(null)
      onSelectedCustomer?.(null)
    }
  }, [value, initialCustomers, onSelectedCustomer])

  useEffect(() => {
    let mounted = true
    async function fetcher() {
      if (typeof loadCustomers === "function") {
        try {
          const res = await loadCustomers(1, debouncedQuery)
          if (!mounted) return
          setResults(res || [])
          setIsOpen(true)
          setHighlight(0)
        } catch (err) {
          console.error("loadCustomers error", err)
          setResults([])
        }
      } else {
        // fallback: filter initialCustomers locally
        const q = debouncedQuery.trim().toLowerCase()
        if (!q) {
          setResults(initialCustomers.slice(0, 20))
          return
        }
        const filtered = (initialCustomers || []).filter((c) => {
          const name =
            `${c.first_name || c.billing?.first_name || ""} ${c.last_name || c.billing?.last_name || ""}`.toLowerCase()
          const phone = (c.billing?.phone || "").toLowerCase()
          const email = (c.email || "").toLowerCase()
          return name.includes(q) || phone.includes(q) || email.includes(q)
        })
        setResults(filtered.slice(0, 50))
        setIsOpen(true)
        setHighlight(0)
      }
    }
    fetcher()
    return () => {
      mounted = false
    }
  }, [debouncedQuery, loadCustomers, initialCustomers])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener("click", onClickOutside)
    return () => window.removeEventListener("click", onClickOutside)
  }, [])

  function displayName(c: WC_Customer) {
    const name = (c.first_name || c.billing?.first_name || "") + " " + (c.last_name || c.billing?.last_name || "")
    return `${name.trim() || "عميل"}${c.billing?.phone ? ` — ${c.billing.phone}` : c.email ? ` — ${c.email}` : ""}`
  }

  function handleSelect(customer: WC_Customer | null) {
    setSelected(customer)
    setIsOpen(false)
    setQuery("")
    if (customer) {
      onChange?.(customer.id)
      onSelectedCustomer?.(customer)
    } else {
      onChange?.("none")
      onSelectedCustomer?.(null)
    }
    // focus back to input for quicker next action
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const sel = results[highlight]
      if (sel) handleSelect(sel)
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="w-full">
      <label className="text-sm font-medium">العميل</label>

      <div className="mt-1 flex gap-2 items-start">
        {/* Left part: tags / selected */}
        <div className="flex-1">
          <div className="relative">
            <div className="flex items-center gap-2">
              {selected ? (
                <div className="flex items-center gap-2 bg-gray-100 border rounded px-2 py-1">
                  <div className="text-sm">
                    <div className="font-medium">{displayName(selected)}</div>
                    <div className="text-xs text-gray-500">ID: {selected.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>  handleSelect(null)}
                    className="text-red-500 text-sm px-2"
                    title="إلغاء الاختيار"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <input
                  ref={inputRef}
                  className="w-full border rounded p-2"
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                  }}
                  onFocus={() => setIsOpen(true)}
                  onKeyDown={handleKeyDown}
                />
              )}
            </div>

            {/* Dropdown */}
            {isOpen && !selected && (
              <div className="absolute z-40 left-0 right-0 mt-2 bg-white border rounded shadow max-h-60 overflow-auto">
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="text-xs text-gray-600">اقتراحات</div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelect(null) // selects "none"
                    }}
                    className="text-xs text-blue-600"
                  >
                    — بدون عميل —
                  </button>
                </div>

                {results.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">لا توجد نتائج</div>
                ) : (
                  <ul className="divide-y">
                    {results.map((c, i) => (
                      <li
                        key={c.id}
                        role="option"
                        aria-selected={i === highlight}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => handleSelect(c)}
                        className={`cursor-pointer p-2 hover:bg-gray-50 ${i === highlight ? "bg-gray-100" : ""}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-sm">{displayName(c)}</div>
                          <div className="text-xs text-gray-500">#{c.id}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="p-2 border-t flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("")
                      inputRef.current?.focus()
                    }}
                    className="text-xs text-gray-600"
                  >
                    مسح
                  </button>
                  <div className="text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        openAddCustomerModal?.()
                        setIsOpen(false)
                      }}
                      className="text-sm px-2 py-1 border rounded text-blue-600"
                    >
                      إضافة عميل
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right part: Quick controls */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setSelected(null)
              onChange?.("none")
              onSelectedCustomer?.(null)
            }}
            className="px-3 py-2 border rounded text-sm"
            title="بدون عميل"
          >
            بدون
          </button>

          <button
            type="button"
            onClick={() => openAddCustomerModal?.()}
            className="px-3 py-2 border rounded text-sm bg-white"
            title="إضافة عميل جديد"
          >
            إضافة
          </button>
        </div>
      </div>
    </div>
  )
}
