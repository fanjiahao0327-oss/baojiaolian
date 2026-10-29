"use client";

import { useEffect, useState } from "react";
import {
  detectFacts,
  ROUTE_LABELS,
  V32_BRANCHES,
  V32_FIXED,
  type Route,
  type V32Answer,
  type V32Facts,
  type V32Question,
} from "@/lib/checkup/v32";

interface FollowupQuestion { id: string; prompt: string; guidance: string; source: string; purpose: string }
interface SummaryData { sections: Array<{ title: string; body: string }>; missing: string[] }
interface Issue { title: string; phenomenon: string; why: string; solution: string; firstStep: string; priority: string }
interface Report { conclusion: string; heard: string[]; issues: Issue[]; nextStep: string; disclaimer: string }

type Screen = "intro" | "fixed" | "followup" | "summary" | "report";

const BY_ID = Object.fromEntries(V32_FIXED.map((q) => [q.id, q]));
const Q1 = BY_ID["v32_q1"];
const Q2 = BY_ID["v32_q2"];
const Q4 = BY_ID["v32_q4"];
const Q6 = BY_ID["v32_q6"];
const Q7 = BY_ID["v32_q7"];
const Q8 = BY_ID["v32_q8"];
const NO_FACTS: V32Facts = { hasChildren: false, hasPartner: false, isBusinessOwner: false };

function adjustRoute(route: Route, secondary: Route | null, facts: V32Facts): { route: Route; secondary: Route | null } {
  let nextRoute = route;
  let nextSecondary = secondary;
  if (nextRoute === "D" || nextRoute === "E") {
    if (!facts.hasChildren) nextRoute = "G";
  }
  if (nextRoute === "F" && !facts.isBusinessOwner) nextRoute = "G";
  if (nextSecondary === "D" || nextSecondary === "E") {
    if (!facts.hasChildren) nextSecondary = null;
  }
  if (nextSecondary === "F" && !facts.isBusinessOwner) nextSecondary = null;
  if (nextSecondary === nextRoute) nextSecondary = null;
  return { route: nextRoute, secondary: nextSecondary };
}

function buildSlots(route: Route | null, secondary: Route | null, facts: V32Facts): V32Question[] {
  const primary = V32_BRANCHES[route ?? "G"];
  const q3: V32Question = { ...primary.q3, title: `${ROUTE_LABELS[route ?? "G"]}·第一层` };
  const q5: V32Question = secondary
    ? { ...V32_BRANCHES[secondary].q3, id: "v32_q5", title: `${ROUTE_LABELS[secondary]}·第一层` }
    : { ...primary.q5, id: "v32_q5", title: `${ROUTE_LABELS[route ?? "G"]}·第二层` };
  const slots = [Q1, Q2, Q4, q3, q5, Q6, Q7];
  if (facts.hasChildren) slots.push(Q8);
  return slots;
}

export default function Checkup10Page() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [fixedIndex, setFixedIndex] = useState(0);
  const [route, setRoute] = useState<Route | null>(null);
  const [secondary, setSecondary] = useState<Route | null>(null);
  const [facts, setFacts] = useState<V32Facts>(NO_FACTS);
  const [answers, setAnswers] = useState<V32Answer[]>([]);
  const [followup, setFollowup] = useState<FollowupQuestion | null>(null);
  const [followupStage, setFollowupStage] = useState(1);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testToken, setTestToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [testSaved, setTestSaved] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("test") || "";
    if (token) setTestToken(token);
  }, []);

  const slots = buildSlots(route, secondary, facts);
  const current = slots[fixedIndex];
  const fixedProgress = `第 ${fixedIndex + 1} / ${slots.length} 题`;
  const followupProgress = `AI 追问 ${followupStage}`;

  function start() {
    setScreen("fixed");
    setFixedIndex(0);
    setRoute(null);
    setSecondary(null);
    setFacts(NO_FACTS);
    setAnswers([]);
    setFollowup(null);
    setSummary(null);
    setReport(null);
    setInput("");
    setError("");
    setSessionId(crypto.randomUUID());
    setTestSaved(false);
  }

  async function classify(text: string) {
    const res = await fetch("/api/checkup/v32/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    const primary = (data.primary || "G") as Route;
    const nextSecondary = data.secondary && data.secondary !== "G" ? (data.secondary as Route) : null;
    setRoute(primary);
    setSecondary(nextSecondary);
    return { primary, secondary: nextSecondary };
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

    if (current.id === "v32_q2") {
      const nextFacts = detectFacts(nextAnswers);
      const adjusted = adjustRoute(route ?? "G", secondary, nextFacts);
      setFacts(nextFacts);
      setRoute(adjusted.route);
      setSecondary(adjusted.secondary);
      setFixedIndex(2);
      return;
    }

    if (current.id === "v32_q4") {
      const nextFacts = detectFacts(nextAnswers);
      const adjusted = adjustRoute(route ?? "G", secondary, nextFacts);
      setFacts(nextFacts);
      setRoute(adjusted.route);
      setSecondary(adjusted.secondary);
      setFixedIndex(3);
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
        body: JSON.stringify({ answers, testToken, sessionId, route }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "报告生成失败");
      setReport(data.report);
      setTestSaved(Boolean(data.testSaved));
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
            <p className="text-[11px] text-gray-400">v3.3 内测 · 条件跳题 + 四段报告</p>
          </div>
          <span className={`rounded-full px-2 py-1 text-[11px] ${testToken ? "bg-purple-50 text-purple-700" : "bg-amber-50 text-amber-700"}`}>
            {testToken ? "测试模式" : "内测版"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {testToken && (
          <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs leading-6 text-purple-700">
            测试模式：本次回答和最终报告会保存到测试记录，仅用于内测复盘；正式客户默认不保存。
          </div>
        )}
        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        {screen === "intro" && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">先说说你担心的事，我们顺着聊</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              系统会先问 6 个固定问题，再根据你的关注点走 2 个分支；后面最多 2 个 AI 追问。
              没有孩子就不问传承，打工人不问家企；报告只写你这次真正用得上的内容。
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
              <p className="text-xs text-blue-600">基于你前面的回答追问</p>
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
              v3.3 内测版：报告直接展示，未走支付。四段结构：结论 → 我听到的情况 → 关键问题+解决方式 → 下一步。
            </div>
            {testToken && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-xs leading-6 text-purple-700">
                {testSaved ? "测试记录已保存，可让 AI 复盘这次对话和报告。" : "测试记录未保存：测试 token 无效或数据库未连接。"}
              </div>
            )}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <h2 className="text-lg font-bold leading-8 text-blue-900">{report.conclusion}</h2>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-gray-800">我听到的情况</h3>
              <ul className="space-y-2 text-xs leading-6 text-gray-600">
                {report.heard.map((line, index) => <li key={index}>· {line}</li>)}
              </ul>
            </div>

            <div className="space-y-3">
              {report.issues.map((issue) => (
                <div key={issue.title} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">{issue.title}</h3>
                    <span className="text-[11px] text-gray-400">{issue.priority}</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-gray-500">{issue.phenomenon}</p>
                  <p className="mt-2 text-xs leading-6 text-gray-500"><span className="font-medium text-gray-700">为什么会这样：</span>{issue.why}</p>
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs leading-6 text-emerald-800"><span className="font-medium">怎么解决：</span>{issue.solution}</p>
                    <p className="mt-1 text-xs leading-6 text-emerald-700"><span className="font-medium">先做一步：</span>{issue.firstStep}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-gray-800">下一步</h3>
              <p className="text-xs leading-6 text-gray-600">{report.nextStep}</p>
            </div>

            <p className="text-[11px] leading-6 text-gray-400">{report.disclaimer}</p>
            <button type="button" onClick={start} className="w-full rounded-full border border-gray-200 px-6 py-3 text-sm text-gray-600">重新测一次</button>
          </section>
        )}
      </div>
    </main>
  );
}
