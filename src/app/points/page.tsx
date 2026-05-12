"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PointTransaction } from "@/types";

export default function PointsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [chargeAmount, setChargeAmount] = useState("");
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/points");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (err) {
      console.error("[PointsPage] fetch error:", err);
      setError("获取积分数据失败");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCharge = async () => {
    const amount = parseInt(chargeAmount, 10);
    if (!amount || amount <= 0) {
      setError("请输入有效的充值数量");
      return;
    }
    setError("");
    setCharging(true);
    try {
      const res = await fetch("/api/points/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "充值失败");
        return;
      }
      const data = await res.json();
      setBalance(data.balance);
      setChargeAmount("");
      fetchData();
    } catch {
      setError("网络错误");
    } finally {
      setCharging(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto p-4 md:p-6">
      <button onClick={() => router.back()} className="text-sm font-medium text-brand-600 hover:text-brand-700 mb-5 inline-flex items-center gap-1">
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
          <span className="text-[11px] text-white/50">每次对话消耗 1 积分</span>
          <span className="text-white/25">·</span>
          <span className="text-[11px] text-white/50">新用户赠送 10 积分</span>
        </div>
      </div>

      {/* 充值 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">充值积分</h2>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={10000}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm"
            placeholder="输入积分数"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
          />
          <button
            onClick={handleCharge}
            disabled={charging}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-xl transition-all hover:shadow-md active:scale-[0.98] text-sm"
          >
            {charging ? "充值中..." : "充值"}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">开发阶段：直接充值积分（无需支付）</p>
        {error && <p className="text-sm text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-1.5">{error}</p>}
      </div>

      {/* 积分流水 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">积分流水</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">暂无记录</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <span className="text-gray-700 text-xs">{tx.description}</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{tx.created_at}</p>
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
