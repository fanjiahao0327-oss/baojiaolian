import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { recordCheckupEvent } from "@/lib/checkup/store";

/** 只允许上报匿名行为事件名，不接受任何对话内容或自由 payload */
const ALLOWED_EVENTS = new Set([
  "session_start",
  "preview_shown",
  "order_created",
  "report_unlocked",
  "booking_created",
]);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 });

  const eventName = String(body.eventName || "").slice(0, 40);
  if (!ALLOWED_EVENTS.has(eventName)) return NextResponse.json({ ok: false }, { status: 400 });

  await recordCheckupEvent(payload.sessionId, eventName);
  return NextResponse.json({ ok: true });
}
