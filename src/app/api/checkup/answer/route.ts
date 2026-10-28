import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { triageFromText } from "@/lib/checkup/triage";
import { MAX_ROUNDS } from "@/lib/checkup/follow-up";
import { extractIntakeProfile } from "@/lib/checkup/intake-ai";
import {
  CONCERN_LABELS,
  buildIntakeSummary,
  emptyProfile,
  profileFromAnswers,
  selectProfileNextQuestion,
  type IntakeProfile,
} from "@/lib/checkup/profile";
import type { Answer } from "@/lib/checkup/types";
import { rateLimit } from "@/lib/rate-limit";

function buildAck(message: string, answers: Answer[]): string {
  if (!message) return "";
  if (answers.length === 1) return "我听到了，先不急着给你套方案。";
  if (message.length < 14) return "";
  if (/孩子|结婚|传承|留点钱/.test(message)) return "我记下了，孩子和传承这条线很关键，我顺着再问一句。";
  if (/生病|医疗|健康|大病/.test(message)) return "明白，健康这件事确实要先看清楚。";
  if (/企业|债务|担保|公司/.test(message)) return "我记下了，企业这条线要单独看，不能和家庭资产混在一起。";
  if (/退休|养老|养老钱/.test(message)) return "我记下了，养老现金流是另一条线，我们慢慢拆。";
  return "我记下了，先不急着下结论。";
}

const OCCUPATION_LABELS: Record<string, string> = {
  employee: "普通职工",
  business_owner: "企业主/经营者",
  family_business: "家人经营企业",
  retired: "已退休",
  other: "其他情况",
};

function openingReflection(profile: IntakeProfile): string {
  const bits: string[] = [];
  if (OCCUPATION_LABELS[profile.occupation]) bits.push(`你是${OCCUPATION_LABELS[profile.occupation]}`);
  if (profile.fields.family_children === "school") bits.push("孩子还在上学");
  if (profile.fields.family_children === "married") bits.push("孩子已经结婚");
  if (profile.fields.protection_medical === "social_only") bits.push("目前只有社保");
  if (profile.concerns.length) bits.push(`比较担心${profile.concerns.map((key) => CONCERN_LABELS[key]).join("、")}`);
  if (!bits.length) return "我听到了，先不急着给你套方案。";
  return `我听到的是：${bits.join("，")}。我先顺着这些往下问，有不对的地方你随时纠正。`;
}

function incomingProfile(raw: unknown): IntakeProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<IntakeProfile>;
  if (!candidate.fields || typeof candidate.fields !== "object") return null;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidate.fields)) {
    if (typeof value === "string" && value.length > 0 && value.length < 40) fields[key] = value;
  }
  return {
    occupation: candidate.occupation ?? "unknown",
    concerns: Array.isArray(candidate.concerns) ? candidate.concerns : [],
    fields,
    openingText: typeof candidate.openingText === "string" ? candidate.openingText.slice(0, 2000) : "",
    reflection: typeof candidate.reflection === "string" ? candidate.reflection.slice(0, 300) : "",
  };
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
  const openingAnswer = answers.find((answer) => answer.questionId === "opening");
  const provided = incomingProfile(body.profile);

  let profile: IntakeProfile;
  if (provided) {
    profile = profileFromAnswers(provided, answers);
  } else if (openingAnswer && answers.length <= 1) {
    // 客户刚说完开场：先用模型把“已经说清楚的”抽出来，避免后面重复问
    profile = await extractIntakeProfile(openingAnswer.freeText || lastMessage);
    profile = profileFromAnswers(profile, answers);
  } else {
    profile = profileFromAnswers(emptyProfile(), answers);
  }

  const triage = triageFromText(profile.openingText || lastMessage || answers.map((a) => a.freeText || "").join(" "));
  const progress = `${Math.min(answers.length, MAX_ROUNDS)}/${MAX_ROUNDS}`;
  const ack =
    profile.reflection ||
    (answers.length <= 1 ? openingReflection(profile) : buildAck(lastMessage, answers));

  const summary = () => {
    const data = buildIntakeSummary(profile, answers);
    return NextResponse.json({ summaryReady: true, summary: data, profile, progress });
  };

  if (body.customerWantsReport) return summary();
  if (answers.length >= MAX_ROUNDS) return summary();

  const next = selectProfileNextQuestion(profile, answers);
  if (!next) return summary();

  return NextResponse.json({
    done: false,
    summaryReady: false,
    ack,
    question: next,
    triage,
    profile,
    progress,
  });
}
