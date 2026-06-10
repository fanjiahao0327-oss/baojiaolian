"use client";

import { useEffect, useState } from "react";
import type { AssistantMode } from "@/lib/assistant-alpha";

const MODES: Array<{ value: AssistantMode; label: string; placeholder: string }> = [
  {
    value: "client_quick_help",
    label: "客户问题",
    placeholder: "描述客户背景、客户原话、你卡住的地方，以及你希望下一步达成什么。",
  },
  {
    value: "agent_blueprint",
    label: "个人蓝图",
    placeholder: "介绍你的从业经历、客户资源、性格、内容偏好、每周投入时间和当前目标。",
  },
  {
    value: "daily_review",
    label: "日复盘",
    placeholder: "说说今天做了什么、见了谁、遇到什么反馈，以及明天想推进什么。",
  },
  {
    value: "content_idea",
    label: "内容建议",
    placeholder: "给我一个真实素材、客户问题、热点或你今天的经历，我来帮你转成内容方向。",
  },
];

function isAssistantMode(value: string): value is AssistantMode {
  return MODES.some((mode) => mode.value === value);
}

export default function AssistantWorkspace() {
  const [mode, setMode] = useState<AssistantMode>("client_quick_help");
  const [input, setInput] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [clientContext, setClientContext] = useState<Record<string, unknown> | null>(null);
  const [clientLabel, setClientLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const queryMode = search.get("mode");
    if (queryMode && isAssistantMode(queryMode)) setMode(queryMode);
    const clientId = search.get("clientId");
    if (clientId) {
      fetch(`/api/clients/${clientId}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((client) => {
          if (!client) return;
          setClientContext({
            id: client.id,
            name: client.name,
            kycSnapshot: client.kyc_snapshot || {},
            stageInfo: client.stageInfo || null,
          });
          setClientLabel(client.name || "当前客户");
        })
        .catch(() => {});
    }
  }, []);

  const selectedMode = MODES.find((item) => item.value === mode) || MODES[0];

  const submit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    setContent("");
    setRating(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, userInput: input, clientContext: clientContext || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setContent(data.content || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (score: number) => {
    setRating(score);
    await fetch("/api/assistant/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: mode,
        score,
        reasonTags: score >= 4 ? ["actionable"] : ["too_generic"],
      }),
    }).catch(() => {});
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      <aside className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 h-fit">
        <h1 className="text-base font-semibold text-gray-900">统一助手</h1>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 mt-4">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                mode === item.value
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-gray-100 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {selectedMode.label}
            {clientLabel && (
              <span className="ml-2 text-xs font-normal text-brand-600">
                {clientLabel}
              </span>
            )}
          </label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={selectedMode.placeholder}
            className="w-full h-40 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
          />
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[11px] text-gray-400">{input.length} 字</p>
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim() || loading}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium disabled:opacity-40"
            >
              {loading ? "处理中..." : "发送给助手"}
            </button>
          </div>
        </div>

        <div className="min-h-80 p-4 bg-gray-50/70">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!error && !content && (
            <div className="h-64 flex items-center justify-center text-sm text-gray-300">
              {loading ? "正在生成" : "等待输入"}
            </div>
          )}
          {content && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{content}</div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">评分</span>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => submitRating(score)}
                    className={`w-8 h-8 rounded-lg text-xs transition-colors ${
                      rating === score
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
