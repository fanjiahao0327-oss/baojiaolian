"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [counting, setCounting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsError, setSmsError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const errorMsg = searchParams.get("error");

  const sendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      setSmsError("请输入正确的手机号");
      return;
    }
    setSmsError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSmsError(data.error || "发送失败");
        return;
      }
      setCounting(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCounting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setSmsError("网络错误");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (!phone || !code) {
      setSmsError("请填写手机号和验证码");
      e.preventDefault();
      return;
    }
    setSubmitting(true);
  };

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 backdrop-blur rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI 保险教练</h1>
          <p className="text-sm text-white/60 mt-1.5">保险代理人的幕后智囊</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form action="/api/auth/login" method="POST" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号</label>
              <input
                type="tel"
                name="phone"
                maxLength={11}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50 hover:bg-white transition-colors"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  maxLength={4}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50 hover:bg-white transition-colors"
                  placeholder="验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={counting}
                  className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 rounded-xl transition-all whitespace-nowrap"
                >
                  {counting ? `${countdown}s` : "获取验证码"}
                </button>
              </div>
            </div>

            {/* 开发提示 */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                内测
              </span>
              <span className="text-[11px] text-gray-400">固定验证码：1234</span>
            </div>

            {(errorMsg || smsError) && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorMsg || smsError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-gradient text-white font-semibold py-3 px-4 rounded-xl transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : (
                "登 录"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">内测版本 · 仅限授权用户</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
