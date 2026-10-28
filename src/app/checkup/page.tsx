"use client";

import { useEffect, useRef, useState } from "react";
import type { IntakeProfile } from "@/lib/checkup/profile";

type Screen = "intro" | "chat" | "summary" | "report" | "booking" | "done";

interface Option { value: string; label: string }
interface Question { id: string; dimension: string; field: string; prompt: string; options: Option[]; hint?: string; example?: string; open?: boolean; openOnly?: boolean; guidance?: string; source?: string; purpose?: string; module?: string; hiddenRisk?: boolean }
interface Answer { questionId: string; dimension: string; field: string; value: string; freeText?: string; skipped: boolean }
interface Message { role: "assistant" | "user"; text: string }
interface SummarySection { title: string; body: string }
interface SummaryData { sections: SummarySection[]; missing: string[] }
interface ModuleInfo { id: string; title: string; intro: string; source: string; index: number; total: number; questionIndex: number; questionTotal: number }
interface ModuleOutlineItem { id: string; title: string }
interface WealthIndex { name: string; score: number | null; level: string; dataStatus: string; reason: string }
interface RiskItem { title: string; severity: string; phenomenon: string; whyItMatters: string; ifIgnored: string; suggestedAction: string }
interface ActionItem { period: string; action: string; owner: string }
interface BudgetRange { min: number | null; max: number | null; basis: string; disclaimer: string }
interface ReportDetailSection { title: string; paragraphs: string[] }
interface DecisionTeaser { problem: string; consequence: string; nextStep: string }
interface Report {
  profile: { familyStructure: string; lifeStage: string; summary: string };
  wealthIndices: WealthIndex[];
  topRisks: RiskItem[];
  actionPlan: ActionItem[];
  budgetRange: BudgetRange;
  nextStep: string;
  disclaimer: string;
  detailSections?: ReportDetailSection[];
  decisionTeaser?: DecisionTeaser;
}

const INDEX_COLORS: Record<string, string> = {
  green: "text-emerald-600 bg-emerald-50",
  yellow: "text-amber-600 bg-amber-50",
  red: "text-red-600 bg-red-50",
  unknown: "text-gray-500 bg-gray-100",
};

function reportText(report: Report): string {
  const lines = ["AI家庭风险测评报告", "", "家庭画像", report.profile.familyStructure, report.profile.summary, "", "家庭财富平衡 5 大指数"];
  report.wealthIndices.forEach((item) => lines.push(`- ${item.name}：${item.score === null ? "信息不足" : `${item.score} 分`}`));
  lines.push("", "Top 风险");
  report.topRisks.forEach((item) => lines.push(`- ${item.title}：${item.ifIgnored || item.whyItMatters}`));
  if (report.decisionTeaser) {
    lines.push("", "决策收口", `P：${report.decisionTeaser.problem}`, `A：${report.decisionTeaser.consequence}`, `S：${report.decisionTeaser.nextStep}`);
  }
  if (report.detailSections?.length) {
    lines.push("", "详细解读");
    report.detailSections.forEach((section) => {
      lines.push("", section.title);
      section.paragraphs.forEach((paragraph) => lines.push(paragraph));
    });
  }
  lines.push("", report.disclaimer);
  return lines.join("\n");
}

export default function CheckupPage() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [sessionToken, setSessionToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [progress, setProgress] = useState("0/26");
  const [topics, setTopics] = useState<string[]>([]);
  const [profile, setProfile] = useState<IntakeProfile | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryInput, setSummaryInput] = useState("");
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [moduleOutline, setModuleOutline] = useState<ModuleOutlineItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [fullReport, setFullReport] = useState<Report | null>(null);
  const [orderNo, setOrderNo] = useState("");
  const [booking, setBooking] = useState({ name: "", phone: "", timeWindow: "", question: "" });
  const [bookingDone, setBookingDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkup/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "开始失败");
      setSessionToken(data.sessionToken);
      setMessages([{ role: "assistant", text: data.opening }]);
      setCurrentQuestion(null);
      setAnswers([]);
      setTriage(null);
      setProgress("0/26");
      setPreviewReport(null);
      setFullReport(null);
      setProfile(null);
      setSummary(null);
      setSummaryInput("");
      setModuleInfo(null);
      setModuleOutline([]);
      setTopics(Array.isArray(data.topics) ? data.topics : []);
      setScreen("chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "开始失败");
    } finally {
      setLoading(false);
    }
  }

  async function preview(nextAnswers: Answer[]) {
    const res = await fetch("/api/checkup/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, answers: nextAnswers, profile }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "生成报告失败");
    setPreviewReport(data.report);
    setScreen("report");
  }

  async function sendAnswer(answer: Answer | null, text: string) {
    if (loading) return;
    setLoading(true);
    setError("");
    const nextAnswers = answer ? [...answers, answer] : answers;
    try {
      const res = await fetch("/api/checkup/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          answers: nextAnswers,
          lastMessage: text,
          triage: triage || undefined,
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setAnswers(nextAnswers);
      if (data.profile) setProfile(data.profile);
      if (data.moduleOutline) setModuleOutline(data.moduleOutline);
      if (data.module) setModuleInfo(data.module);
      if (data.summaryReady) {
        setSummary(data.summary);
        setCurrentQuestion(null);
        setScreen("summary");
        return;
      }
      if (data.triage) setTriage(data.triage);
      if (data.progress) setProgress(data.progress);
      if (data.done) {
        setMessages((prev) => [
          ...prev,
          { role: "user", text },
          ...(data.ack ? [{ role: "assistant" as const, text: data.ack }] : []),
        ]);
        await preview(nextAnswers);
        return;
      }
      setCurrentQuestion(data.question || null);
      setMessages((prev) => [
        ...prev,
        { role: "user", text },
        ...(data.moduleSummary ? [{ role: "assistant" as const, text: data.moduleSummary }] : []),
        ...(data.ack ? [{ role: "assistant" as const, text: data.ack }] : []),
        { role: "assistant", text: data.question.prompt },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  function onOption(option: Option) {
    if (!currentQuestion) return;
    const answer: Answer = {
      questionId: currentQuestion.id,
      dimension: currentQuestion.dimension,
      field: currentQuestion.field,
      value: option.value,
      skipped: false,
    };
    void sendAnswer(answer, option.label);
  }

  function onSkip() {
    if (!currentQuestion) return;
    const answer: Answer = {
      questionId: currentQuestion.id,
      dimension: currentQuestion.dimension,
      field: currentQuestion.field,
      value: "skip",
      skipped: true,
    };
    void sendAnswer(answer, "这个先跳过");
  }

  function sendOpening(text: string) {
    const answer: Answer = {
      questionId: "opening",
      dimension: "family",
      field: "openingText",
      value: "free_text",
      freeText: text,
      skipped: false,
    };
    void sendAnswer(answer, text);
  }

  function onSendText() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (!currentQuestion) {
      sendOpening(text);
      return;
    }
    const answer: Answer = {
      questionId: currentQuestion.id,
      dimension: currentQuestion.dimension,
      field: currentQuestion.field,
      value: "free_text",
      freeText: text,
      skipped: false,
    };
    void sendAnswer(answer, text);
  }

  async function finishEarly() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkup/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, answers, profile, customerWantsReport: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成报告失败");
      if (data.profile) setProfile(data.profile);
      if (data.summaryReady) {
        setSummary(data.summary);
        setScreen("summary");
        return;
      }
      if (data.done) await preview(answers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成报告失败");
    } finally {
      setLoading(false);
    }
  }

  async function sendSummaryNote() {
    const text = summaryInput.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    const note: Answer = {
      questionId: "summary_note",
      dimension: "family",
      field: "summaryNote",
      value: "free_text",
      freeText: text,
      skipped: false,
    };
    const nextAnswers = [...answers, note];
    try {
      const res = await fetch("/api/checkup/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, answers: nextAnswers, lastMessage: text, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "补充失败");
      setAnswers(nextAnswers);
      if (data.profile) setProfile(data.profile);
      if (data.moduleOutline) setModuleOutline(data.moduleOutline);
      if (data.module) setModuleInfo(data.module);
      if (data.summaryReady) {
        setSummary(data.summary);
        setSummaryInput("");
        return;
      }
      if (data.question) {
        setCurrentQuestion(data.question);
        setScreen("chat");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "补充失败");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSummary() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await preview(answers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成报告失败");
    } finally {
      setLoading(false);
    }
  }

  async function payAndUnlock() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const orderRes = await fetch("/api/checkup/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, mock: true }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "下单失败");
      setOrderNo(orderData.orderNo);
      if (!orderData.mock) throw new Error("当前演示版只支持本地模拟支付");
      const mockRes = await fetch("/api/checkup/pay/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: orderData.orderNo }),
      });
      if (!mockRes.ok) throw new Error("模拟支付失败");
      const unlockRes = await fetch("/api/checkup/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, orderNo: orderData.orderNo, answers, profile }),
      });
      const unlockData = await unlockRes.json();
      if (!unlockRes.ok) throw new Error(unlockData.error || "解锁失败");
      setFullReport(unlockData.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解锁失败");
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    const report = fullReport || previewReport;
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportText(report));
      setError("");
      alert("报告已复制");
    } catch {
      setError("复制失败，请手动选择文字复制");
    }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!booking.name.trim() || !/^1\d{10}$/.test(booking.phone) || !booking.timeWindow.trim()) {
      setError("请填写称呼、手机号和方便时间");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkup/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, ...booking }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setBookingDone(true);
      setScreen("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setScreen("intro");
    setSessionToken("");
    setMessages([]);
    setCurrentQuestion(null);
    setAnswers([]);
    setTriage(null);
    setProgress("0/26");
    setInput("");
    setError("");
    setPreviewReport(null);
    setFullReport(null);
    setProfile(null);
    setSummary(null);
    setSummaryInput("");
    setModuleInfo(null);
    setModuleOutline([]);
    setOrderNo("");
    setBooking({ name: "", phone: "", timeWindow: "", question: "" });
    setBookingDone(false);
  }

  const report = fullReport || previewReport;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI家庭风险测评</h1>
            <p className="text-[11px] text-gray-400">匿名 · 不保存对话 · 先看清风险，再谈安排</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600">本地演示版</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {screen === "intro" && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">10 分钟，看清你家最该先处理的风险</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              我是樊家浩，过去 4 年做京东运营，现在专注结合 AI 做家庭风险和传承，定位是「财富安全风险架构师」。
            </p>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              很多客户不愿意一上来就把家里情况告诉代理人，所以我把它做成一个可以匿名使用的测评。你的回答不会被保存，只会存在你自己的手机上。
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-500">
              测什么：家庭结构、已有保障、收支与资产、婚姻与传承安排。不推销、不承诺，只给风险判断。
              <br />
              本报告由 AI 辅助生成，仅供风险自查参考，不构成保险产品推荐、投保建议或法律意见。
            </div>
            <button
              type="button"
              onClick={start}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "准备中…" : "开始测评"}
            </button>
          </section>
        )}

        {screen === "chat" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>进度 {progress}</span>
              <button type="button" onClick={restart} className="underline">重新开始</button>
            </div>
            {moduleOutline.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {moduleOutline.map((item) => (
                  <span
                    key={item.id}
                    className={`rounded-full px-2.5 py-1 ${
                      moduleInfo?.id === item.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.title}
                  </span>
                ))}
              </div>
            )}
            {moduleInfo && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium text-blue-800">
                  第 {moduleInfo.index}/{moduleInfo.total} 部分 · {moduleInfo.title}
                  <span className="ml-2 font-normal text-blue-600">（{moduleInfo.questionIndex}/{moduleInfo.questionTotal}）</span>
                </p>
                <p className="mt-1 text-[11px] leading-5 text-blue-700">{moduleInfo.intro}</p>
              </div>
            )}
            <div className="max-h-[55vh] space-y-3 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {loading && <div className="text-xs text-gray-400">正在想下一个问题…</div>}
              <div ref={bottomRef} />
            </div>

            {!currentQuestion && messages.length <= 1 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
                <p className="font-medium">不知道从哪说？可以按这些方向随便聊：</p>
                {topics.length > 0 && <p className="mt-1">{topics.join(" / ")}</p>}
                <p className="mt-2 text-blue-700">
                  也可以聊：为什么现在想了解、家里几口人、孩子多大、父母需不需要照顾、最近发生了什么、你最担心谁。
                  不用组织语言，想到哪说到哪；不想说可以跳过。
                </p>
              </div>
            )}

            {currentQuestion && (
              <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4">
                {currentQuestion.hint && (
                  <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-700">
                    <p>提示：{currentQuestion.hint}</p>
                    {currentQuestion.example && <p className="mt-1 text-blue-600/80">例子：{currentQuestion.example}</p>}
                    {currentQuestion.purpose && <p className="mt-1 text-blue-600/80">为什么问：{currentQuestion.purpose}</p>}
                    {currentQuestion.source && <p className="mt-1 text-blue-500/70">依据：{currentQuestion.source}</p>}
                  </div>
                )}
                {currentQuestion.openOnly ? (
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-600">
                    <p>这一题不用选，直接用自己的话说。</p>
                    {currentQuestion.guidance && <p className="mt-1">{currentQuestion.guidance}</p>}
                  </div>
                ) : (
                  currentQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onOption(option)}
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {option.label}
                    </button>
                  ))
                )}
                <div className="flex justify-between pt-1 text-xs text-gray-500">
                  <button type="button" onClick={onSkip} disabled={loading} className="underline">不想说，跳过</button>
                  <button type="button" onClick={finishEarly} disabled={loading} className="underline">直接出报告</button>
                </div>
              </div>
            )}

            {!currentQuestion && (
              <div className="flex justify-end text-xs text-gray-500">
                <button type="button" onClick={finishEarly} disabled={loading} className="underline">直接出报告</button>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder={
                  currentQuestion
                    ? currentQuestion.openOnly
                      ? "直接说，想到哪说到哪；不想说可以跳过…"
                      : "也可以直接打字补充…"
                    : "想到哪说到哪，不用组织语言；说个大概就行…"
                }
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={onSendText}
                disabled={loading || !input.trim()}
                className="self-end rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </section>
        )}

        {screen === "summary" && summary && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">我先跟你确认一下</h2>
              <p className="mt-2 text-xs leading-6 text-gray-500">
                下面是我目前理解的你的情况。如果有不对、缺漏，直接在下面补充；确认没问题，我再生成完整报告。
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="space-y-4">
                {summary.sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-gray-600">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {summary.missing.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-700">这几项我还不确定，你可以补一句：</p>
                <ul className="mt-2 space-y-1 text-xs leading-6 text-amber-700">
                  {summary.missing.map((item) => <li key={item}>· {item}</li>)}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <textarea
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                placeholder="有补充或纠正，直接说，比如：房子其实是两套、孩子还没结婚、保单受益人是我妈……"
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={sendSummaryNote}
                  disabled={loading || !summaryInput.trim()}
                  className="rounded-full border border-blue-200 px-5 py-3 text-sm font-medium text-blue-600 disabled:opacity-50"
                >
                  补充进去
                </button>
                <button
                  type="button"
                  onClick={confirmSummary}
                  disabled={loading}
                  className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "生成中…" : "确认，生成报告"}
                </button>
              </div>
              <button type="button" onClick={() => setScreen("chat")} className="mt-3 w-full text-xs text-gray-400 underline">
                返回继续聊
              </button>
            </div>
          </section>
        )}

        {screen === "report" && report && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">AI家庭风险测评报告</h2>
              <p className="mt-2 text-xs leading-6 text-gray-500">{report.profile.familyStructure}</p>
              <p className="mt-1 text-xs leading-6 text-gray-500">{report.profile.summary}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">家庭财富五维自检（自检参考，不是科学测评）</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {report.wealthIndices.map((item) => (
                  <div key={item.name} className={`rounded-xl p-3 ${INDEX_COLORS[item.level] || INDEX_COLORS.unknown}`}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{item.name}</span>
                      <span>{item.score === null ? "信息不足" : `${item.score} 分`}</span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-80">{item.reason || (item.score === null ? "本次信息不足，建议线下一对一补充" : "")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">{fullReport ? "Top 5 风险" : "Top 3 风险（免费版）"}</h3>
              <div className="space-y-3">
                {report.topRisks.map((risk) => (
                  <div key={risk.title} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-800">{risk.title}</p>
                    <p className="mt-1 text-xs leading-6 text-gray-500">
                      {fullReport ? `${risk.phenomenon} ${risk.ifIgnored} ${risk.suggestedAction}` : risk.phenomenon}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {fullReport && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-800">家庭风险预算区间</h3>
                <p className="mt-2 text-sm text-gray-700">
                  {fullReport.budgetRange.min === null
                    ? "信息不足"
                    : `${fullReport.budgetRange.min.toLocaleString()} – ${fullReport.budgetRange.max?.toLocaleString()} 元 / 年`}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">{fullReport.budgetRange.basis} · {fullReport.budgetRange.disclaimer}</p>
              </div>
            )}

            {!fullReport && report.decisionTeaser && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-sm font-semibold text-blue-800">如果只做一件事：PAS 决策收口</h3>
                <p className="mt-3 text-xs leading-6 text-blue-800"><span className="font-semibold">P 问题：</span>{report.decisionTeaser.problem}</p>
                <p className="mt-2 text-xs leading-6 text-blue-800"><span className="font-semibold">A 为什么现在处理：</span>{report.decisionTeaser.consequence}</p>
                <p className="mt-2 text-xs leading-6 text-blue-800"><span className="font-semibold">S 完整版会给你：</span>{report.decisionTeaser.nextStep}；以及一张「先处理哪一件」的决策表。</p>
              </div>
            )}

            {!fullReport && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-700">完整版会展开 9 个章节：</p>
                <p className="mt-1 text-[11px] leading-6 text-blue-600">
                  家庭时间轴 · 五维自检逐项解读 · 风险背后的法律/财务机制 · 分模块推演 · 传承架构对比 · 家企隔离/婚姻财产 · 下次诊断准备 · 预算与免责声明
                </p>
              </div>
            )}

            {!fullReport && (
              <button
                type="button"
                onClick={payAndUnlock}
                disabled={loading}
                className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "处理中…" : "1 元解锁完整报告（本地演示，不扣款）"}
              </button>
            )}

            {fullReport?.detailSections && fullReport.detailSections.length > 0 && (
              <div className="space-y-4">
                {fullReport.detailSections.map((section) => (
                  <div key={section.title} className="rounded-2xl border border-gray-100 bg-white p-5">
                    <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                    <div className="mt-2 space-y-2">
                      {section.paragraphs.map((paragraph, index) => (
                        <p key={index} className="text-xs leading-7 text-gray-600">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fullReport && (
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={copyReport} className="rounded-full border border-blue-200 px-5 py-3 text-sm font-medium text-blue-600">
                  复制报告文字
                </button>
                <button type="button" onClick={() => setScreen("booking")} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
                  预约一对一诊断
                </button>
              </div>
            )}

            <p className="text-[11px] leading-6 text-gray-400">{report.disclaimer}</p>
            {orderNo && <p className="text-[11px] text-gray-300">订单号：{orderNo}</p>}
          </section>
        )}

        {screen === "booking" && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">预约一次一对一诊断</h2>
            <p className="mt-2 text-xs leading-6 text-gray-500">留下称呼、手机号和方便时间，我会在 24 小时内联系你。</p>
            <form onSubmit={submitBooking} className="mt-4 space-y-3">
              <input
                value={booking.name}
                onChange={(e) => setBooking({ ...booking, name: e.target.value })}
                placeholder="怎么称呼你"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <input
                value={booking.phone}
                onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                placeholder="手机号"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <input
                value={booking.timeWindow}
                onChange={(e) => setBooking({ ...booking, timeWindow: e.target.value })}
                placeholder="方便时间，例如：工作日晚 8 点后"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <textarea
                value={booking.question}
                onChange={(e) => setBooking({ ...booking, question: e.target.value })}
                placeholder="最想解决的一个问题（选填）"
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "提交中…" : "提交预约"}
              </button>
            </form>
            <button type="button" onClick={() => setScreen("report")} className="mt-3 w-full text-xs text-gray-400 underline">
              返回报告
            </button>
          </section>
        )}

        {screen === "done" && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">已收到</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">我会在 24 小时内联系你。也可以先通过小程序客服问我。</p>
            <button type="button" onClick={restart} className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white">
              再测一次
            </button>
          </section>
        )}

        {screen !== "intro" && (
          <p className="mt-6 text-center text-[11px] text-gray-400">
            本工具由 AI 辅助生成风险自查参考，不构成保险产品推荐、投保建议或法律意见。
          </p>
        )}
      </div>
    </main>
  );
}
