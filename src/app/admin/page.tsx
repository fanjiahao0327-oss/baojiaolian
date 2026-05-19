"use client";

import { useEffect, useState, useCallback } from "react";

interface PaymentOrder {
  id?: number;
  order_no: string;
  user_id?: number;
  phone?: string;
  points: number;
  amount_cents: number;
  status: string;
  payment_method: string;
  payment_ref: string;
  created_at: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = { "x-admin-key": adminKey };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const login = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/orders", { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setAuthed(true);
      } else {
        setError("密钥错误");
      }
    } catch {
      setError("网络错误");
    }
  };

  const confirmOrder = async (orderNo: string) => {
    if (!confirm(`确认收款 ${orderNo}？`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderNo}/confirm`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "确认失败");
      setOrders((prev) => prev.filter((o) => o.order_no !== orderNo));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cancelOrder = async (orderNo: string) => {
    if (!confirm(`取消订单 ${orderNo}？`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderNo}/cancel`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取消失败");
      setOrders((prev) => prev.filter((o) => o.order_no !== orderNo));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!authed) {
    return (
      <main className="max-w-sm mx-auto p-4 md:p-6 pt-20">
        <h1 className="text-lg font-bold text-gray-800 mb-4 text-center">管理员登录</h1>
        <input
          type="password"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm mb-3"
          placeholder="输入管理员密钥"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <button
          onClick={login}
          className="w-full py-2.5 bg-brand-gradient text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm"
        >
          进入
        </button>
        {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-800">待确认订单</h1>
        <button
          onClick={fetchOrders}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          {loading ? "刷新中..." : "刷新"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p>暂无待处理订单</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.order_no} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-800">{o.order_no}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(o.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">
                  待确认
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
                <div>
                  <span className="text-gray-400">积分</span>
                  <p className="font-semibold text-gray-700">{o.points} 分</p>
                </div>
                <div>
                  <span className="text-gray-400">金额</span>
                  <p className="font-semibold text-gray-700">¥{(o.amount_cents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-400">方式</span>
                  <p className="font-semibold text-gray-700">{o.payment_method === "wechat" ? "微信" : "支付宝"}</p>
                </div>
              </div>
              {o.payment_ref && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs mb-3">
                  <span className="text-gray-400">交易单号：</span>
                  <span className="font-mono text-gray-700">{o.payment_ref}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => confirmOrder(o.order_no)}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  确认收款
                </button>
                <button
                  onClick={() => cancelOrder(o.order_no)}
                  className="py-2 px-4 border border-gray-200 text-gray-400 text-xs rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
