"use client";

import { useEffect, useState } from "react";
import type { MemoryScope, MemoryStatus } from "@/lib/assistant-alpha";

interface MemoryItem {
  id: number;
  clientId: number | null;
  scope: MemoryScope;
  memoryType: string;
  title: string;
  content: string;
  sourceType: string;
  sourceRef: string;
  confidence: number;
  status: MemoryStatus;
  updatedAt: string;
}

const STATUS_LABEL: Record<MemoryStatus, string> = {
  proposed: "待确认",
  confirmed: "已确认",
  rejected: "已拒绝",
};

export default function MemoryCenter() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<MemoryScope>("agent");
  const [loading, setLoading] = useState(true);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/memories", { cache: "no-store" });
      if (res.ok) setMemories(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const create = async () => {
    if (!content.trim()) return;
    const res = await fetch("/api/assistant/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || "手动记忆",
        content: content.trim(),
        scope,
        status: "confirmed",
      }),
    });
    if (res.ok) {
      setTitle("");
      setContent("");
      fetchMemories();
    }
  };

  const patchStatus = async (id: number, status: MemoryStatus) => {
    const res = await fetch(`/api/assistant/memories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchMemories();
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/assistant/memories/${id}`, { method: "DELETE" });
    if (res.ok) fetchMemories();
  };

  return (
    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">AI 记忆中心</h2>
      </div>

      <div className="p-4 border-b border-gray-100 grid md:grid-cols-[160px_1fr_auto] gap-3">
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as MemoryScope)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
        >
          <option value="agent">代理人</option>
          <option value="client">客户</option>
          <option value="global">通用</option>
        </select>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="标题"
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          />
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="记忆内容"
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={!content.trim()}
          className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium disabled:opacity-40"
        >
          保存记忆
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">加载中</p>
        ) : memories.length === 0 ? (
          <p className="p-4 text-sm text-gray-300">暂无记忆</p>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800">{memory.title}</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {STATUS_LABEL[memory.status]}
                  </span>
                  <span className="text-[11px] text-gray-300">{memory.confidence}%</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 leading-6">{memory.content}</p>
                <p className="text-[11px] text-gray-300 mt-1">{memory.updatedAt}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {memory.status !== "confirmed" && (
                  <button
                    type="button"
                    onClick={() => patchStatus(memory.id, "confirmed")}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-green-50 text-green-700"
                  >
                    确认
                  </button>
                )}
                {memory.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => patchStatus(memory.id, "rejected")}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-gray-100 text-gray-500"
                  >
                    拒绝
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(memory.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-red-50 text-red-600"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
