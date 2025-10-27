"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DUMMY_USER = {
  email: process.env.LOGIN_EMAIL,
  password: process.env.LOGIN_PASSWORD
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    if (email === DUMMY_USER.email && password === DUMMY_USER.password) {
      localStorage.setItem("isLoggedIn", "true");
      toast.success("تم تسجيل الدخول بنجاح!");
      router.push("/pos");
    } else {
      toast.error("الإيميل أو كلمة المرور غير صحيحة");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">تسجيل الدخول</h1>
        <Input
          type="email"
          placeholder="الإيميل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3"
        />
        <Input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />
        <Button onClick={handleLogin} className="w-full">دخول</Button>
      </div>
    </div>
  );
}
