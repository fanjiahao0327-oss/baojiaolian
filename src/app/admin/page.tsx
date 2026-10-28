"use client";

import { useState, useCallback } from "react";

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

interface CapacityTable {
  name: string;
  totalBytes: number;
  tableBytes: number;
  indexBytes: number;
  rowCount: number;
  estimatedRows: number;
}

interface CapacityReport {
  databaseName: string;
  checkedAt: string;
  databaseBytes: number;
  capacityBytes: number;
  usagePercent: number;
  status: "healthy" | "watch" | "warning" | "critical";
  statusLabel: string;
  warning: string;
  tables: CapacityTable[];
}

const CAPACITY_STATUS_STYLES: Record<CapacityReport["status"], string> = {
  healthy: "bg-green-50 text-green-600 border-green-100",
  watch: "bg-blue-50 text-blue-600 border-blue-100",
  warning: "bg-amber-50 text-amber-600 border-amber-100",
  critical: "bg-red-50 text-red-600 border-red-100",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function getRowsLabel(table: CapacityTable): number {
  return table.rowCount > 0 ? table.rowCount : table.estimatedRows;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [capacity, setCapacity] = useState<CapacityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [error, setError] = useState("");
  const [capacityError, setCapacityError] = useState("");

  const getHeaders = useCallback(() => ({ "x-admin-key": adminKey }), [adminKey]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchCapacity = useCallback(async () => {
    setCapacityLoading(true);
    setCapacityError("");
    try {
      const res = await fetch("/api/admin/capacity", { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "容量监控加载失败");
      setCapacity(data.capacity || null);
    } catch (e) {
      setCapacityError((e as Error).message || "容量监控加载失败");
    } finally {
      setCapacityLoading(false);
    }
  }, [getHeaders]);

  const refreshAll = () => {
    void fetchOrders();
    void fetchCapacity();
  };

  const login = async () => {
    setError("");
    setCapacityError("");
    try {
      const res = await fetch("/api/admin/orders", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setAuthed(true);
        void fetchCapacity();
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
        headers: getHeaders(),
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
        headers: getHeaders(),
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
        <div>
          <h1 className="text-lg font-bold text-gray-800">管理后台</h1>
          <p className="text-xs text-gray-400 mt-0.5">订单确认与数据库容量监控</p>
        </div>
        <button
          onClick={refreshAll}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          {loading || capacityLoading ? "刷新中..." : "刷新"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600">{error}</div>
      )}

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">容量监控</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              只展示数据库聚合指标，不展示客户资料或对话内容
            </p>
          </div>
          {capacity && (
            <span className={`px-2 py-0.5 border text-[11px] font-medium rounded-full ${CAPACITY_STATUS_STYLES[capacity.status]}`}>
              {capacity.statusLabel}
            </span>
          )}
        </div>

        {capacityLoading && !capacity ? (
          <div className="text-sm text-gray-400 py-4">容量数据加载中...</div>
        ) : capacity ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400">当前容量</span>
                <p className="font-semibold text-gray-800 mt-1">{formatBytes(capacity.databaseBytes)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400">容量上限</span>
                <p className="font-semibold text-gray-800 mt-1">{formatBytes(capacity.capacityBytes)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400">使用率</span>
                <p className="font-semibold text-gray-800 mt-1">{capacity.usagePercent}%</p>
              </div>
            </div>

            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${
                  capacity.status === "critical"
                    ? "bg-red-500"
                    : capacity.status === "warning"
                      ? "bg-amber-500"
                      : capacity.status === "watch"
                        ? "bg-blue-500"
                        : "bg-green-500"
                }`}
                style={{ width: `${Math.min(capacity.usagePercent, 100)}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 mb-4">{capacity.warning}</p>

            <div className="space-y-2">
              {capacity.tables.map((table) => (
                <div key={table.name} className="flex items-center justify-between text-xs border-t border-gray-50 pt-2">
                  <div>
                    <p className="font-mono text-gray-700">{table.name}</p>
                    <p className="text-gray-400">行数 {getRowsLabel(table)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-700">{formatBytes(table.totalBytes)}</p>
                    <p className="text-gray-400">索引 {formatBytes(table.indexBytes)}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 mt-3">
              最近检查：{new Date(capacity.checkedAt).toLocaleString("zh-CN")}
            </p>
          </>
        ) : (
          <div className="text-sm text-gray-400 py-4">暂无容量数据</div>
        )}

        {capacityError && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mt-3 text-xs text-amber-600">
            {capacityError}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800">待确认订单</h2>
        <span className="text-xs text-gray-400">{orders.length} 笔</span>
      </div>

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
