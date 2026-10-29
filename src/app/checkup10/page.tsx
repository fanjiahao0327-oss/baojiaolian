"use client";

import { useState } from "react";
import {
  ROUTE_LABELS,
  V32_BRANCHES,
  V32_FIXED,
  type Route,
  type V32Answer,
  type V32Question,
} from "@/lib/checkup/v32";

interface FollowupQuestion { id: string; prompt: string; guidance: string; source: string; purpose: string }
interface SummaryData { sections: Array<{ title: string; body: string }>; missing: string[] }
interface Dimension { name: string; status: string; evidence: string; mechanism: string; question: string }
interface Risk { title: string; phenomenon: string; mechanism: string; priority: string; question: string }
interface Report {
  quotes: string[];
  dimensions: Dimension[];
  risks: Risk[];
  pending: string[];
  decision: { problem: string; education: string; solution: string };
  nextStep: string;
  disclaimer: string;
}

type Screen = "intro" | "fixed" | "followup" | "summary" | "report";

const BY_ID = Object.fromEntries(V32_FIXED.map((q) => [q.id, q]));
const Q1 = BY_ID["v32_q1"];
const Q2 = BY_ID["v32_q2"];
const Q4 = BY_ID["v32_q4"];
const Q6 = BY_ID["v32_q6"];
const Q7 = BY_ID["v32_q7"];
const Q8 = BY_ID["v32_q8"];

const STATUS_COLOR: Record<string, string> = {
  有安排: "bg-emerald-50 text-emerald-700",
  空白: "bg-amber-50 text-amber-700",
  待确认: "bg-gray-100 text-gray-500",
};

function buildSlots(route: Route | null, secondary: Route | null): V32Question[] {
  const primary = V32_BRANCHES[route ?? "G"];
  const q3: V32Question = {
    ...primary.q3,
    title: `${ROUTE_LABELS[route ?? "G"]}·第一层`,
  };
  const q5: V32Question = secondary
    ? {
        ...V32_BRANCHES[secondary].q3,
        id: "v32_q5",
        title: `${ROUTE_LABELS[secondary]}·第一层`,
      }
    : {
        ...primary.q5,
        id: "v32_q5",
        title: `${ROUTE_LABELS[route ?? "G"]}·第二层`,
      };
  return [Q1, Q2, q3, Q4, q5, Q6, Q7, Q8];
}

export default function Checkup10Page() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [fixedIndex, setFixedIndex] = useState(0);
  const [route, setRoute] = useState<Route | null>(null);
  const [secondary, setSecondary] = useState<Route | null>(null);
  const [answers, setAnswers] = useState<V32Answer[]>([]);
  const [followup, setFollowup] = useState<FollowupQuestion | null>(null);
  const [followupStage, setFollowupStage] = useState(1);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slots = buildSlots(route, secondary);
  const current = slots[fixedIndex];
  const fixedProgress = `第 ${fixedIndex + 1} / 10 题`;
  const followupProgress = `第 ${8 + followupStage} / 10 题${followupStage === 3 ? "（条件追问）" : ""}`;

  function start() {
    setScreen("fixed");
    setFixedIndex(0);
    setRoute(null);
    setSecondary(null);
    setAnswers([]);
    setFollowup(null);
    setSummary(null);
    setReport(null);
    setInput("");
    setError("");
  }

  async function classify(text: string) {
    const res = await fetch("/api/checkup/v32/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    const primary = (data.primary || "G") as Route;
    setRoute(primary);
    setSecondary(data.secondary && data.secondary !== "G" ? (data.secondary as Route) : null);
    return { primary, secondary: data.secondary as Route | null };
  }

  async function requestFollowup(stage: number, currentAnswers: V32Answer[]) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkup/v32/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: currentAnswers, stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "追问生成失败");
      if (data.done) {
        setSummary(data.summary);
        setScreen("summary");
        return;
      }
      setFollowup(data.question);
      setFollowupStage(stage);
      setScreen("followup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "追问生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitFixed(skip = false) {
    const text = input.trim();
    if (!text && !skip) {
      setError("说一句就行，或者点「跳过」");
      return;
    }
    const answer: V32Answer = { questionId: current.id, title: current.title, prompt: current.prompt, answer: text };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setInput("");
    setError("");
    if (current.id === "v32_q1") {
      setLoading(true);
      try {
        await classify(text || "说不清");
        setFixedIndex(1);
      } catch {
        setRoute("G");
        setSecondary(null);
        setFixedIndex(1);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (fixedIndex < slots.length - 1) {
      setFixedIndex(fixedIndex + 1);
      return;
    }
    void requestFollowup(1, nextAnswers);
  }

  function submitFollowup(skip = false) {
    if (!followup) return;
    const text = input.trim();
    if (!text && !skip) {
      setError("说一句就行，或者点「跳过」");
      return;
    }
    const nextAnswers = [...answers, { questionId: followup.id, title: `AI 追问 ${followupStage}`, prompt: followup.prompt, answer: text }];
    setAnswers(nextAnswers);
    setInput("");
    setError("");
    if (followupStage < 3) {
      void requestFollowup(followupStage + 1, nextAnswers);
    } else {
      void requestFollowup(3, nextAnswers);
    }
  }

  async function generateReport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkup/v32/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "报告生成失败");
      setReport(data.report);
      setScreen("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "报告生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI家庭风险测评</h1>
            <p className="text-[11px] text-gray-400">v3.2 内测 · 6 个固定入口 + 2 个分支 + 2 个 AI 追问</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-700">内测版</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        {screen === "intro" && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">先说说你担心的事，我们顺着聊</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              前面 8 个入口题，只有 6 个固定、2 个跟着你的关注点走；后面 2 个问题由 AI 根据你的回答追问。
              最后给你一份风险筛查报告，不出分数，只标「有安排 / 空白 / 待确认」。
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-500">
              不用组织语言，想到哪说到哪；不想说可以跳过。本内测版直接展示完整报告，不走支付。
              <br />
              本报告为风险筛查参考，不构成诊断、保险产品推荐、投保建议、法律或投资意见。
            </div>
            <button type="button" onClick={start} className="mt-6 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white">
              开始测评
            </button>
          </section>
        )}

        {screen === "fixed" && current && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{fixedProgress}</span>
              <button type="button" onClick={start} className="underline">重新开始</button>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-blue-600">{current.title}{route ? ` · 你这次关注：${ROUTE_LABELS[route]}` : ""}</p>
              <h2 className="mt-2 text-lg font-semibold leading-8 text-gray-900">{current.prompt}</h2>
              <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
                <p>{current.guidance}</p>
                <p className="mt-1 text-blue-500/70">依据：{current.source}</p>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                placeholder="想到哪说到哪，不用组织语言；一句话、一段话都可以…"
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => submitFixed(true)} disabled={loading} className="rounded-full border border-gray-200 px-5 py-3 text-sm text-gray-500 disabled:opacity-50">
                  跳过
                </button>
                <button type="button" onClick={() => submitFixed(false)} disabled={loading} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {loading ? "正在归类…" : fixedIndex === slots.length - 1 ? "回答完，进入 AI 追问" : "下一题"}
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === "followup" && followup && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{followupProgress}</span>
              <button type="button" onClick={start} className="underline">重新开始</button>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-blue-600">AI 追问 {followupStage} · 基于你前面的回答</p>
              <h2 className="mt-2 text-lg font-semibold leading-8 text-gray-900">{followup.prompt}</h2>
              <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
                <p>{followup.guidance}</p>
                <p className="mt-1 text-blue-600/80">为什么问：{followup.purpose}</p>
                <p className="mt-1 text-blue-500/70">依据：{followup.source}</p>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={5}
                placeholder="直接说，想到哪说到哪；不想说可以跳过…"
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => submitFollowup(true)} disabled={loading} className="rounded-full border border-gray-200 px-5 py-3 text-sm text-gray-500 disabled:opacity-50">
                  跳过
                </button>
                <button type="button" onClick={() => submitFollowup(false)} disabled={loading} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {loading ? "正在判断…" : "提交回答"}
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === "summary" && summary && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">我先跟你确认一下</h2>
              <p className="mt-2 text-xs leading-6 text-gray-500">下面是这次你亲口说过的重点。确认后生成风险筛查报告。</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="space-y-4">
                {summary.sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-gray-600">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
            {summary.missing.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-700">
                还没说的是：{summary.missing.join("、")}。报告里会标「待确认」。
              </div>
            )}
            <button type="button" onClick={generateReport} disabled={loading} className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "正在生成报告…" : "确认，生成风险筛查报告"}
            </button>
            <button type="button" onClick={start} className="w-full text-xs text-gray-400 underline">重新回答</button>
          </section>
        )}

        {screen === "report" && report && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-700">
              v3.2 内测版：报告直接展示，未走支付；五维只出「有安排 / 空白 / 待确认」，不出分数。
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">家庭风险筛查报告</h2>
              <div className="mt-3 space-y-2">
                {report.quotes.map((quote, index) => (
                  <p key={index} className="border-l-2 border-blue-200 pl-3 text-xs leading-6 text-gray-600">“{quote}”</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-800">五维风险地图（自检参考，不是诊断）</h3>
              <div className="mt-3 space-y-3">
                {report.dimensions.map((item) => (
                  <div key={item.name} className={`rounded-xl p-3 ${STATUS_COLOR[item.status] || "bg-gray-100 text-gray-600"}`}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{item.name}</span>
                      <span>{item.status}</span>
                    </div>
                    <p className="mt-1 text-xs leading-6 opacity-90">依据：{item.evidence}</p>
                    <p className="mt-1 text-xs leading-6 opacity-90">{item.mechanism}</p>
                    <p className="mt-1 text-xs leading-6 opacity-90">可以想一想：{item.question}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">风险与待确认</h3>
              {report.risks.length === 0 ? (
                <p className="text-xs leading-6 text-gray-500">这次没有发现明显高风险项，但仍建议线下一对一补充信息。</p>
              ) : (
                <div className="space-y-3">
                  {report.risks.map((risk) => (
                    <div key={risk.title} className="rounded-xl bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-800">{risk.title}<span className="ml-2 text-[11px] text-gray-400">{risk.priority}</span></p>
                      <p className="mt-1 text-xs leading-6 text-gray-500">{risk.phenomenon}</p>
                      <p className="mt-1 text-xs leading-6 text-gray-500">{risk.mechanism}</p>
                      <p className="mt-1 text-xs leading-6 text-blue-700">可以想一想：{risk.question}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-gray-800">可以带去线下确认的事</h3>
              <ul className="space-y-1 text-xs leading-6 text-gray-600">
                {report.pending.map((item) => <li key={item}>· {item}</li>)}
              </ul>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="text-sm font-semibold text-blue-800">如果只先处理一件事</h3>
              <p className="mt-3 text-xs leading-6 text-blue-800"><span className="font-semibold">P 问题：</span>{report.decision.problem}</p>
              <p className="mt-2 text-xs leading-6 text-blue-800"><span className="font-semibold">A 机理：</span>{report.decision.education}</p>
              <p className="mt-2 text-xs leading-6 text-blue-800"><span className="font-semibold">S 下一步：</span>{report.decision.solution}</p>
            </div>

            <p className="text-[11px] leading-6 text-gray-400">{report.nextStep}</p>
            <p className="text-[11px] leading-6 text-gray-400">{report.disclaimer}</p>
            <button type="button" onClick={start} className="w-full rounded-full border border-gray-200 px-6 py-3 text-sm text-gray-600">重新测一次</button>
          </section>
        )}
      </div>
    </main>
  );
}
