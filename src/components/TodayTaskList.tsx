"use client";

import { useEffect, useState } from "react";
import type { TodaySections, TodayTask } from "@/lib/assistant-alpha";

const SECTION_CONFIG: Array<{
  key: keyof TodaySections;
  title: string;
  empty: string;
}> = [
  { key: "mustDo", title: "必须处理", empty: "暂无明确承诺事项" },
  { key: "suggested", title: "建议推进", empty: "暂无建议跟进客户" },
  { key: "longTerm", title: "长期经营", empty: "暂无长期经营动作" },
];

function formatDueAt(dueAt: string | null) {
  if (!dueAt) return "";
  return new Date(dueAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TaskRow({
  task,
  onStatusChange,
}: {
  task: TodayTask;
  onStatusChange: (id: number, status: "done" | "dismissed") => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {[task.clientName, formatDueAt(task.dueAt)].filter(Boolean).join(" · ") || "未设置时间"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onStatusChange(task.id, "done")}
          className="px-2.5 py-1 text-[11px] rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
        >
          完成
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(task.id, "dismissed")}
          className="px-2.5 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          忽略
        </button>
      </div>
    </div>
  );
}

export default function TodayTaskList() {
  const [sections, setSections] = useState<TodaySections>({
    mustDo: [],
    suggested: [],
    longTerm: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/tasks", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (id: number, status: "done" | "dismissed") => {
    const res = await fetch("/api/assistant/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchTasks();
  };

  return (
    <section className="grid md:grid-cols-3 gap-3">
      {SECTION_CONFIG.map((section) => {
        const tasks = sections[section.key];
        return (
          <div key={section.key} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 min-h-36">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">{section.title}</h2>
              <span className="text-[11px] text-gray-400">{loading ? "..." : tasks.length}</span>
            </div>
            {loading ? (
              <p className="text-xs text-gray-300 py-6">加载中</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-gray-300 py-6">{section.empty}</p>
            ) : (
              tasks.map((task) => (
                <TaskRow key={task.id} task={task} onStatusChange={updateStatus} />
              ))
            )}
          </div>
        );
      })}
    </section>
  );
}
