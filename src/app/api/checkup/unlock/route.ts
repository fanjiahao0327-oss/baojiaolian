import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifySessionToken } from "@/lib/checkup/session";
import { getCheckupOrder, canUnlock, recordCheckupEvent } from "@/lib/checkup/store";
import { buildReport, enhanceReport, reportToText } from "@/lib/checkup/report";
import { triageFromText } from "@/lib/checkup/triage";
import { buildIndexInputFromAnswers } from "@/lib/checkup/index-input";
import { scanCheckupCompliance } from "@/lib/checkup/compliance";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  const session = await getSession();
  const isDev = process.env.NODE_ENV !== "production";
  if (!session.userId && !isDev) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  const order = await getCheckupOrder(String(body.orderNo || ""));
  if (!order || !canUnlock(order as { status: string; session_id: string }, payload.sessionId)) {
    return NextResponse.json({ error: "订单未支付或已失效" }, { status: 402 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  const triage = triageFromText(answers.map((a: { freeText?: string; value?: string }) => `${a.freeText ?? ""} ${a.value ?? ""}`).join(" "));
  const draft = buildReport({ answers, triage, input: buildIndexInputFromAnswers(answers) });
  const enhanced = await enhanceReport(draft, async (prompt) => {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });
    return completion.choices[0]?.message?.content || "";
  });
  const risks = scanCheckupCompliance(reportToText(enhanced));
  const report = risks.length > 0 ? draft : enhanced;
  await recordCheckupEvent(payload.sessionId, "report_unlocked");
  return NextResponse.json({ report, complianceRisks: risks.map((risk) => risk.code) });
}
