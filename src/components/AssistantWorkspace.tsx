"use client";

import { useEffect, useState } from "react";
import type { AssistantMode } from "@/lib/assistant-alpha";

const PATHS: Array<{
  value: AssistantMode;
  label: string;
  title: string;
  description: string;
  placeholder: string;
  process: string[];
  cta: string;
}> = [
  {
    value: "client_quick_help",
    label: "客户帮助",
    title: "现在这位客户，下一步怎么推进",
    description: "适合面谈前、微信沟通前、客户出现异议后使用。",
    placeholder:
      "可以直接讲：你和客户什么关系、最近发生了什么、客户原话是什么、你卡在哪里、你希望下一步先达成什么。信息不够时，助手只会追问最关键的 1 到 3 个问题。",
    process: ["判断客户所处阶段", "区分事实、判断和推测", "给出下一步目标与建议表达"],
    cta: "生成客户建议",
  },
  {
    value: "agent_blueprint",
    label: "经营系统",
    title: "建立适合你的个人经营蓝图",
    description: "适合第一次系统使用，或希望重新梳理定位、内容和行动节奏时使用。",
    placeholder:
      "用 3 到 5 分钟介绍你自己：从业经历、城市、学历履历、性格、客户来源、资源、是否愿意出镜、每周可投入时间、当前目标和困难。也可以粘贴个人简介、朋友圈文字或内容样本。",
    process: ["整理你的事实与偏好", "形成初步定位和探索方向", "给出今天、明天和 7 天行动"],
    cta: "生成经营蓝图",
  },
  {
    value: "daily_review",
    label: "日复盘",
    title: "把今天发生的事整理成明天行动",
    description: "适合每天结束前 1 到 3 分钟快速复盘。",
    placeholder:
      "说说今天做了什么、联系了谁、客户有什么反馈、自己哪里卡住、明天想推进什么。助手会提炼客户线索、内容素材和明天最重要的行动。",
    process: ["提炼真实进展", "识别客户和内容线索", "调整明天优先级"],
    cta: "生成复盘",
  },
  {
    value: "content_idea",
    label: "内容建议",
    title: "把真实素材变成低推销感内容",
    description: "适合朋友圈、视频脚本、选题和栏目方向。",
    placeholder:
      "给我一个真实素材、客户问题、热点、朋友圈草稿或今天的经历。助手会先判断是否适合你的定位，再给内容角度、表达建议和风险提示。",
    process: ["判断是否适合你的定位", "降低推销感和焦虑感", "输出内容方向与风险提示"],
    cta: "生成内容建议",
  },
];

function isAssistantMode(value: string): value is AssistantMode {
  return PATHS.some((mode) => mode.value === value);
}

export default function AssistantWorkspace() {
  const [mode, setMode] = useState<AssistantMode>("client_quick_help");
  const [input, setInput] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [clientContext, setClientContext] = useState<Record<string, unknown> | null>(null);
  const [clientLabel, setClientLabel] = useState("");
  const [clientName, setClientName] = useState("");
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

  const selectedPath = PATHS.find((item) => item.value === mode) || PATHS[0];
  const needsClientName = mode === "client_quick_help" && !clientContext;
  const canSubmit = Boolean(input.trim()) && (!needsClientName || Boolean(clientName.trim())) && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setContent("");
    setRating(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          userInput: input,
          clientName: clientName.trim() || undefined,
          clientContext: clientContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      if (data.client?.id) {
        setClientContext(data.client);
        setClientLabel(data.client.name || "当前客户");
      }
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
    <div className="grid lg:grid-cols-[300px_1fr] gap-4">
      <aside className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 h-fit">
        <div>
          <p className="text-xs font-medium text-brand-600">私人 AI 助手</p>
          <h1 className="mt-1 text-lg font-semibold text-gray-900">今天要处理什么</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 mt-4">
          {PATHS.map((item) => (
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
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs font-medium text-gray-500">助手会先做的判断</p>
          <div className="mt-2 space-y-1.5">
            {selectedPath.process.map((item) => (
              <p key={item} className="text-xs leading-5 text-gray-500">
                {item}
              </p>
            ))}
          </div>
        </div>
      </aside>

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="mb-3">
            <label className="block text-base font-semibold text-gray-900">
              {selectedPath.title}
            </label>
            {clientLabel && (
              <span className="mt-1 inline-flex text-xs font-normal text-brand-600">
                {clientLabel}
              </span>
            )}
            <p className="mt-1 text-xs leading-5 text-gray-400">{selectedPath.description}</p>
          </div>
          {needsClientName && (
            <label className="block mb-3">
              <span className="text-xs font-medium text-gray-500">客户称呼</span>
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="例如：张先生、李姐、老同学王某"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
            </label>
          )}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={selectedPath.placeholder}
            className="w-full h-56 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
          />
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[11px] text-gray-400">{input.length} 字</p>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium disabled:opacity-40"
            >
              {loading ? "处理中..." : selectedPath.cta}
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
            <div className="h-64 flex items-center justify-center text-center text-sm text-gray-300">
              {loading ? "正在生成" : "输入真实情况后，助手会给出可执行的下一步。"}
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
