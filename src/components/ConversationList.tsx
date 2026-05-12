"use client";

import { useEffect, useState } from "react";
import type { ConversationSummary, Message } from "@/types";

interface Props {
  onSelect: (messages: Message[]) => void;
  onClose: () => void;
  active: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: "跟进中", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  won: { label: "已成交", cls: "bg-green-50 text-green-600 border-green-200" },
  lost: { label: "已流失", cls: "bg-gray-50 text-gray-400 border-gray-200" },
};

export default function ConversationList({ onSelect, onClose, active }: Props) {
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        setList(await res.json());
      }
    } catch {
      console.error("[ConversationList] fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      fetchList();
    }
  }, [active]);

  const handleSelect = async (id: number) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        onSelect(data.messages);
      }
    } catch {
      console.error("[ConversationList] load error");
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setList((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: newStatus as ConversationSummary["status"] } : item
          )
        );
      }
    } catch {
      console.error("[ConversationList] status update error");
    }
  };

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-80 max-w-full bg-white h-full shadow-2xl overflow-y-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            历史对话
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-5 w-5 text-gray-300" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm text-gray-400">暂无对话记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {list.map((item) => (
              <div key={item.id} className="group relative">
                <button
                  onClick={() => handleSelect(item.id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                      {item.client_name && (
                        <p className="text-xs text-brand-500 mt-0.5 truncate">{item.client_name}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 truncate">{item.preview || "无内容"}</p>
                    </div>
                    {item.status && (
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[item.status]?.cls}`}>
                        {STATUS_CONFIG[item.status]?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1.5">{item.created_at}</p>
                </button>
                {/* 状态切换 */}
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select
                    className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-500 bg-white cursor-pointer"
                    value={item.status || "active"}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(item.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="active">跟进中</option>
                    <option value="won">已成交</option>
                    <option value="lost">已流失</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
