import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { buildReport, toFreeReport } from "@/lib/checkup/report";
import { triageFromText } from "@/lib/checkup/triage";
import { recordCheckupEvent } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  const answers = Array.isArray(body.answers) ? body.answers : [];
  const triage = triageFromText(
    answers
      .map((a: { freeText?: string; value?: string }) => `${a.freeText ?? ""} ${a.value ?? ""}`)
      .join(" "),
  );
  const report = toFreeReport(buildReport({ answers, triage, input: body.indexInput ?? {} }));
  await recordCheckupEvent(payload.sessionId, "preview_shown");

  return NextResponse.json({ report, sessionId: payload.sessionId });
}
