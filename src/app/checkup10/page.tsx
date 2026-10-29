"use client";

import { useState } from "react";
import { TEN_FIXED_QUESTIONS, type TenAnswer } from "@/lib/checkup/ten-questions";

interface FollowupQuestion {
  id: string;
  prompt: string;
  guidance: string;
  source: string;
  purpose: string;
}

interface SummaryData {
  sections: Array<{ title: string; body: string }>;
  missing: string[];
}

interface WealthIndex { name: string; score: number | null; level: string; reason: string }
interface RiskItem { title: string; severity: string; phenomenon: string; whyItMatters: string; ifIgnored: string; suggestedAction: string }
interface DetailSection { title: string; paragraphs: string[] }
interface Report {
  profile: { familyStructure: string; lifeStage: string; summary: string };
  wealthIndices: WealthIndex[];
  topRisks: RiskItem[];
  detailSections?: DetailSection[];
  decisionTeaser?: { problem: string; consequence: string; nextStep: string };
  budgetRange?: { min: number | null; max: number | null; basis: string; disclaimer: string };
  disclaimer: string;
}

const INDEX_COLORS: Record<string, string> = {
  green: "text-emerald-600 bg-emerald-50",
  yellow: "text-amber-600 bg-amber-50",
  red: "text-red-600 bg-red-50",
  unknown: "text-gray-500 bg-gray-100",
};

type Screen = "intro" | "fixed" | "followup" | "summary" | "report";

export default function Checkup10Page() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [fixedIndex, setFixedIndex] = useState(0);
  const [answers, setAnswers] = useState<TenAnswer[]>([]);
  const [followup, setFollowup] = useState<FollowupQuestion | null>(null);
  const [followupStage, setFollowupStage] = useState(1);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fixed = TEN_FIXED_QUESTIONS[fixedIndex];
  const progressLabel =
    screen === "fixed"
      ? `第 ${fixedIndex + 1} / 10 题`
      : screen === "followup"
        ? `第 ${9 + followupStage - 1} / 10 题${followupStage === 3 ? "（条件追问）" : ""}`
        : "";

  function start() {
    setScreen("fixed");
    setFixedIndex(0);
    setAnswers([]);
    setFollowup(null);
    setSummary(null);
    setReport(null);
    setInput("");
    setError("");
  }

  async function requestFollowup(stage: number, currentAnswers: TenAnswer[]) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkup/ten/followup", {
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

  function submitFixed(skip = false) {
    const text = input.trim();
    if (!text && !skip) {
      setError("说一句就行，或者点「跳过」");
      return;
    }
    const nextAnswers = [
      ...answers,
      { questionId: fixed.id, title: fixed.title, prompt: fixed.prompt, answer: text },
    ];
    setAnswers(nextAnswers);
    setInput("");
    setError("");
    if (fixedIndex < TEN_FIXED_QUESTIONS.length - 1) {
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
    const nextAnswers = [
      ...answers,
      {
        questionId: followup.id,
        title: `AI 追问 ${followupStage}`,
        prompt: followup.prompt,
        answer: text,
      },
    ];
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
      const res = await fetch("/api/checkup/ten/report", {
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
            <p className="text-[11px] text-gray-400">10 题内测版 · 8 个固定风险域 + 2 个 AI 追问</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-700">内测版</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        {screen === "intro" && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">10 个问题，看清你家最该先处理的风险</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              前面 8 个问题是固定的风险域：家庭、职业与企业、健康、养老、传承、婚姻、教育、资产现金流。
              后面 2 个问题由 AI 根据你的回答追问；如果还有重大缺口，会多问 1 个。
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-500">
              不用组织语言，想到哪说到哪；不想说可以跳过。本内测版直接展示完整报告，不走支付。
              <br />
              本报告由 AI 辅助生成，仅供风险自查参考，不构成保险产品推荐、投保建议或法律意见。
            </div>
            <button type="button" onClick={start} className="mt-6 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white">
              开始 10 题测评
            </button>
          </section>
        )}

        {screen === "fixed" && fixed && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{progressLabel}</span>
              <button type="button" onClick={start} className="underline">重新开始</button>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-blue-600">固定问题 {fixed.index}/8 · {fixed.title}</p>
              <h2 className="mt-2 text-lg font-semibold leading-8 text-gray-900">{fixed.prompt}</h2>
              <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
                <p>引导：{fixed.guidance}</p>
                <p className="mt-1 text-blue-600/80">为什么问：{fixed.purpose}</p>
                <p className="mt-1 text-blue-500/70">依据：{fixed.source}</p>
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
                  跳过这一题
                </button>
                <button type="button" onClick={() => submitFixed(false)} disabled={loading} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {fixedIndex === 7 ? "回答完，进入 AI 追问" : "下一题"}
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === "followup" && followup && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{progressLabel}</span>
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
              <p className="mt-2 text-xs leading-6 text-gray-500">
                下面是我从你 8 个固定回答和 AI 追问里整理出来的重点。确认后生成完整报告；如果有不对，重新开始即可（内测版暂不做逐条修改）。
              </p>
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
                还没提供的：{summary.missing.join("、")}。报告里对应部分会标「信息不足」。
              </div>
            )}
            <button type="button" onClick={generateReport} disabled={loading} className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "正在生成报告…" : "确认，生成完整报告（内测版）"}
            </button>
            <button type="button" onClick={start} className="w-full text-xs text-gray-400 underline">重新回答</button>
          </section>
        )}

        {screen === "report" && report && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-700">
              10 题内测版：完整报告直接展示，未经过支付。正式版会把这份报告放到 1 元解锁后。
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">家庭风险筛查报告</h2>
              <p className="mt-2 text-xs leading-6 text-gray-500">{report.profile.familyStructure}</p>
              <p className="mt-1 text-xs leading-6 text-gray-500">{report.profile.summary}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-800">五维自检（自检参考，不是科学测评）</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {report.wealthIndices.map((item) => (
                  <div key={item.name} className={`rounded-xl p-3 ${INDEX_COLORS[item.level] || INDEX_COLORS.unknown}`}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{item.name}</span>
                      <span>{item.score === null ? "信息不足" : `${item.score} 分`}</span>
                    </div>
                    {item.reason && <p className="mt-1 text-[11px] opacity-80">{item.reason}</p>}
                  </div>
                ))}
              </div>
            </div>

            {report.decisionTeaser && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-sm font-semibold text-blue-800">如果只做一件事：PAS 决策收口</h3>
                <p className="mt-3 text-xs leading-6 text-blue-800"><span className="font-semibold">P 问题：</span>{report.decisionTeaser.problem}</p>
                <p className="mt-2 text-xs leading-6 text-blue-800"><span className="font-semibold">A 为什么现在处理：</span>{report.decisionTeaser.consequence}</p>
                <p className="mt-2 text-xs leading-6 text-blue-800"><span className="font-semibold">S 下一步：</span>{report.decisionTeaser.nextStep}</p>
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">风险清单</h3>
              <div className="space-y-3">
                {report.topRisks.map((risk) => (
                  <div key={risk.title} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-800">{risk.title}</p>
                    <p className="mt-1 text-xs leading-6 text-gray-500">{risk.phenomenon} {risk.whyItMatters} {risk.ifIgnored}</p>
                    <p className="mt-1 text-xs leading-6 text-blue-700">建议：{risk.suggestedAction}</p>
                  </div>
                ))}
              </div>
            </div>

            {(report.detailSections || []).map((section) => (
              <div key={section.title} className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                <div className="mt-2 space-y-2">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-xs leading-7 text-gray-600">{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}

            <p className="text-[11px] leading-6 text-gray-400">{report.disclaimer}</p>
            <button type="button" onClick={start} className="w-full rounded-full border border-gray-200 px-6 py-3 text-sm text-gray-600">重新测一次</button>
          </section>
        )}
      </div>
    </main>
  );
}
