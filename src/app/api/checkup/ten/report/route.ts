import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { tenAnswersToStructured } from "@/lib/checkup/ten-questions";
import { buildIndexInputFromAnswers } from "@/lib/checkup/index-input";
import { buildReport } from "@/lib/checkup/report";
import { triageFromText } from "@/lib/checkup/triage";
import { buildTenSummary, TEN_FIXED_QUESTIONS, type TenAnswer } from "@/lib/checkup/ten-questions";

function normalizeAnswers(raw: unknown): TenAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is TenAnswer => Boolean(item && typeof item === "object"))
    .map((item) => ({
      questionId: String(item.questionId || "").slice(0, 50),
      title: String(item.title || "").slice(0, 80),
      prompt: String(item.prompt || "").slice(0, 600),
      answer: String(item.answer || "").slice(0, 3000),
    }))
    .filter((item) => item.questionId.length > 0);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:ten-report:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const answers = normalizeAnswers(body.answers);
  const fixed = answers.filter((answer) => TEN_FIXED_QUESTIONS.some((q) => q.id === answer.questionId));
  if (fixed.length < 8) {
    return NextResponse.json({ error: "请先回答完 8 个固定问题" }, { status: 400 });
  }

  const combined = answers
    .map((answer) => `【${answer.title || answer.questionId}】\n${answer.answer}`)
    .join("\n\n")
    .slice(0, 12000);
  const summary = buildTenSummary(answers);

  const structuredAnswers = tenAnswersToStructured(answers);
  const report = buildReport({
    answers: structuredAnswers,
    triage: triageFromText(combined),
    input: buildIndexInputFromAnswers(structuredAnswers),
  });

  report.detailSections = [
    {
      title: "你回答的 10 个问题",
      paragraphs: summary.sections.map((section) => `${section.title}：${section.body}`),
    },
    ...(report.detailSections || []),
  ];
  report.profile.summary = `${report.profile.summary} 本页为 10 题内测版，报告直接展示，未经过支付。`;

  return NextResponse.json({
    mode: "ten",
    report,
    summary,
    fixedCount: fixed.length,
  });
}
