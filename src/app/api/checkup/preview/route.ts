import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { buildReport, toFreeReport } from "@/lib/checkup/report";
import { triageFromText } from "@/lib/checkup/triage";
import { buildIndexInputFromAnswers } from "@/lib/checkup/index-input";
import { mergeProfileAnswers, type IntakeProfile } from "@/lib/checkup/profile";
import { recordCheckupEvent } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  const answers = Array.isArray(body.answers) ? (body.answers as Parameters<typeof mergeProfileAnswers>[1]) : [];
  const profile = body.profile && typeof body.profile === "object" ? (body.profile as IntakeProfile) : null;
  const allAnswers = mergeProfileAnswers(profile, answers);
  const triage = triageFromText(
    allAnswers
      .map((a) => `${a.freeText ?? ""} ${a.value ?? ""}`)
      .join(" "),
  );
  const report = toFreeReport(buildReport({ answers: allAnswers, triage, input: buildIndexInputFromAnswers(allAnswers) }));
  await recordCheckupEvent(payload.sessionId, "preview_shown");

  return NextResponse.json({ report, sessionId: payload.sessionId });
}
