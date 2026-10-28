import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { triageFromText } from "@/lib/checkup/triage";
import { selectNextQuestion, shouldStop, MAX_ROUNDS } from "@/lib/checkup/follow-up";
import type { Answer } from "@/lib/checkup/types";
import { rateLimit } from "@/lib/rate-limit";

function buildAck(message: string, answers: Answer[]): string {
  if (!message) return "";
  // 开场第一段：先确认“我听到了”，再进入结构化问题
  if (answers.length === 1) return "我听到了，先不急着给你套方案。";
  // 只有客户打字补充时才回应；点选项不重复说“我记下了”
  if (message.length < 14) return "";
  if (/孩子|结婚|传承|留点钱/.test(message)) return "我记下了，孩子和传承这条线很关键，我顺着再问一句。";
  if (/生病|医疗|健康|大病/.test(message)) return "明白，健康这件事确实要先看清楚。";
  if (/企业|债务|担保|公司/.test(message)) return "我记下了，企业这条线要单独看，不能和家庭资产混在一起。";
  if (/退休|养老|养老钱/.test(message)) return "我记下了，养老现金流是另一条线，我们慢慢拆。";
  return "我记下了，先不急着下结论。";
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:answer:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期，请重新开始" }, { status: 401 });

  const answers = Array.isArray(body.answers) ? (body.answers as Answer[]) : [];
  const lastMessage = String(body.lastMessage || "");
  let triage = body.triage || triageFromText(lastMessage || answers.map((a) => a.freeText || "").join(" "));

  // 客户在“最担心哪一类”里明确选了方向后，以这个选择为准，而不是继续沿用开场关键词
  const lastAnswer = answers[answers.length - 1];
  const reflectionDomains: Record<string, "medical" | "inheritance" | "retirement" | "business"> = {
    health: "medical",
    inheritance: "inheritance",
    retirement: "retirement",
    business: "business",
  };
  if (lastAnswer?.questionId === "opening_reflection" && reflectionDomains[lastAnswer.value]) {
    triage = {
      ...triage,
      primaryDomain: reflectionDomains[lastAnswer.value],
      confidence: Math.max(triage.confidence, 0.8),
      signals: [...triage.signals, `reflection:${lastAnswer.value}`],
    };
  }

  const state = { answers, triage, customerWantsReport: Boolean(body.customerWantsReport) };

  const ack = buildAck(lastMessage, answers);

  if (shouldStop(state)) {
    return NextResponse.json({ done: true, ack, progress: `${Math.min(answers.length, MAX_ROUNDS)}/${MAX_ROUNDS}` });
  }

  const next = selectNextQuestion(state);
  if (!next) return NextResponse.json({ done: true, ack, progress: `${answers.length}/${MAX_ROUNDS}` });

  return NextResponse.json({
    done: false,
    ack,
    question: next,
    triage,
    progress: `${answers.length}/${MAX_ROUNDS}`,
  });
}
