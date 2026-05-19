"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PointTransaction } from "@/types";
import { PRICE_PACKAGES, type PricePackage } from "@/lib/pricing";

export default function PointsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PricePackage | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [amountYuan, setAmountYuan] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "pay" | "submitted">("select");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const ptsRes = await fetch("/api/points");
      if (ptsRes.ok) {
        const data = await ptsRes.json();
        setBalance(data.balance);
        setTransactions(data.transactions);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectPackage = (pkg: PricePackage) => {
    setSelectedPkg(pkg);
    setError("");
  };

  const createOrder = async () => {
    if (!selectedPkg) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/payment/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: selectedPkg.points, payment_method: paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建订单失败");
      setOrderNo(data.order_no);
      setAmountYuan(data.amount_yuan);
      setStep("pay");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!orderNo) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/payment/orders/${orderNo}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_ref: paymentRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setStep("submitted");
      setMsg("支付凭证已提交，管理员确认后积分将自动到账，通常 30 分钟内完成。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelectedPkg(null);
    setOrderNo(null);
    setPaymentRef("");
    setPaymentMethod("wechat");
    setStep("select");
    setError("");
    setMsg("");
  };

  return (
    <main className="max-w-lg mx-auto p-4 md:p-6">
      <button
        onClick={() => router.back()}
        className="text-sm font-medium text-brand-600 hover:text-brand-700 mb-5 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      {/* 积分余额卡片 */}
      <div className="bg-brand-gradient rounded-2xl shadow-lg p-6 mb-5 text-white">
        <p className="text-sm text-white/60 font-medium">当前积分</p>
        <p className="text-5xl font-bold mt-1 tracking-tight">{balance !== null ? balance : "..."}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px] text-white/50">约 2000 Token = 1 积分</span>
          <span className="text-white/25">·</span>
          <span className="text-[11px] text-white/50">新用户赠送 50 积分</span>
        </div>
      </div>

      {/* 错误/成功消息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600">{error}</div>
      )}
      {msg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-600">{msg}</div>
      )}

      {/* 步骤 1: 选择套餐 */}
      {step === "select" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">购买积分</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {PRICE_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => selectPackage(pkg)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  selectedPkg?.id === pkg.id
                    ? "border-brand-500 bg-brand-50 shadow-sm"
                    : "border-gray-150 hover:border-gray-300 bg-gray-50"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    推荐
                  </span>
                )}
                <p className="text-lg font-bold text-gray-800">{pkg.points} 分</p>
                <p className="text-sm text-brand-600 font-semibold mt-0.5">
                  ¥{(pkg.amountCents / 100).toFixed(2)}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  约 {(pkg.points / 5).toFixed(0)} 次对话
                </p>
              </button>
            ))}
          </div>

          {/* 支付方式 */}
          <div className="flex gap-2 mb-4">
            {["wechat", "alipay"].map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m as "wechat" | "alipay")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  paymentMethod === m ? "bg-brand-50 text-brand-700 border border-brand-300" : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}
              >
                {m === "wechat" ? "微信支付" : "支付宝"}
              </button>
            ))}
          </div>

          <button
            onClick={createOrder}
            disabled={!selectedPkg || submitting}
            className="w-full py-3 bg-brand-gradient text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {submitting ? "创建订单中..." : `购买${selectedPkg ? ` ¥${(selectedPkg.amountCents / 100).toFixed(2)}` : ""}`}
          </button>
        </div>
      )}

      {/* 步骤 2: 支付指引 */}
      {step === "pay" && orderNo && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">扫码支付</h2>

          {/* 订单信息 */}
          <div className="bg-amber-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">订单号</span>
              <span className="font-mono font-semibold text-gray-800">{orderNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">金额</span>
              <span className="font-bold text-brand-600">¥{amountYuan}</span>
            </div>
          </div>

          {/* 收款码 */}
          <div className="flex justify-center mb-4">
            <img
              src={paymentMethod === "wechat" ? "/payment-qr-wechat.jpg" : "/payment-qr-alipay.jpg"}
              alt="收款码"
              className="w-48 h-48 rounded-xl border border-gray-200 object-cover"
            />
          </div>

          <ol className="text-xs text-gray-500 space-y-1.5 mb-4 list-decimal pl-4">
            <li>使用{paymentMethod === "wechat" ? "微信" : "支付宝"}扫描上方二维码转账 <strong className="text-gray-700">¥{amountYuan}</strong></li>
            <li>转账<strong className="text-gray-700">备注</strong>请填写订单号：<code className="bg-gray-100 px-1 rounded text-brand-600">{orderNo}</code></li>
            <li>转账完成后，输入{paymentMethod === "wechat" ? "微信" : "支付宝"}交易单号</li>
          </ol>

          <input
            type="text"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm mb-3 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="请输入交易单号后 8 位"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={submitPayment}
              disabled={!paymentRef.trim() || submitting}
              className="flex-1 py-2.5 bg-brand-gradient text-white font-semibold text-sm rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "提交中..." : "我已完成支付"}
            </button>
          </div>
        </div>
      )}

      {/* 步骤 3: 已提交 */}
      {step === "submitted" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">提交成功</h3>
          <p className="text-sm text-gray-500 mb-4">{msg}</p>
          <button
            onClick={() => { reset(); fetchData(); }}
            className="px-6 py-2 bg-brand-50 text-brand-700 font-medium rounded-xl hover:bg-brand-100 transition-colors text-sm"
          >
            继续购买
          </button>
        </div>
      )}

      {/* 积分流水 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">积分流水</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">暂无记录</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <span className="text-gray-700 text-xs">{tx.description}</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(tx.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${tx.type === "charge" ? "text-green-500" : "text-red-400"}`}>
                  {tx.type === "charge" ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
