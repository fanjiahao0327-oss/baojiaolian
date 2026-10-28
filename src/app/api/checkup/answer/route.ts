import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { triageFromText } from "@/lib/checkup/triage";
import { selectNextQuestion, shouldStop, MAX_ROUNDS } from "@/lib/checkup/follow-up";
import type { Answer } from "@/lib/checkup/types";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:answer:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期，请重新开始" }, { status: 401 });

  const answers = Array.isArray(body.answers) ? (body.answers as Answer[]) : [];
  const lastMessage = String(body.lastMessage || "");
  const triage = body.triage || triageFromText(lastMessage || answers.map((a) => a.freeText || "").join(" "));
  const state = { answers, triage, customerWantsReport: Boolean(body.customerWantsReport) };

  if (shouldStop(state)) {
    return NextResponse.json({ done: true, progress: `${Math.min(answers.length, MAX_ROUNDS)}/${MAX_ROUNDS}` });
  }

  const next = selectNextQuestion(state);
  if (!next) return NextResponse.json({ done: true, progress: `${answers.length}/${MAX_ROUNDS}` });

  return NextResponse.json({
    done: false,
    question: next,
    triage,
    progress: `${answers.length}/${MAX_ROUNDS}`,
  });
}
