"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("isLoggedIn");
    setIsLoggedIn(stored === "true");
  }, []);

  function handleLogout() {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    toast.success("تم تسجيل الخروج");
    router.push("/"); // يرجع الصفحة الرئيسية أو صفحة تسجيل الدخول
  }

  const links = [
    { href: "/pos", label: "الكاشير (POS)" },
    { href: "/local-orders", label: "الطلبات الأوفلاين" },
    { href: "/online-orders", label: "الطلبات الأونلاين" },
    { href: "/employee", label: "الموظفين" },
    { href: "/suppliers", label: "الموردين" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-8xl mx-auto px-4 py-2 flex items-center justify-between">
        <a href={process.env.NEXT_PUBLIC_WC_URL} target="_blank" className="text-lg underline font-bold text-gray-700">🏍️ {process.env.NEXT_PUBLIC_WC_URL}</a>

        <div className="flex gap-4 items-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1 rounded-md text-xl font-medium transition-colors ${
                pathname === link.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-md text-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              تسجيل الخروج
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
