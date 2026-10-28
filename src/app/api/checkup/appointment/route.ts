import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { createCheckupAppointment, recordCheckupEvent } from "@/lib/checkup/store";
import { rateLimit } from "@/lib/rate-limit";
import { verifySessionToken } from "@/lib/checkup/session";

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

export async function POST(request: NextRequest) {
  const rl = rateLimit("checkup:appointment", "payment");
  if (!rl.allowed) return NextResponse.json({ error: "操作过于频繁" }, { status: 429 });
  const body = await request.json();
  const name = String(body.name || "").trim().slice(0, 20);
  const phone = String(body.phone || "").trim();
  const timeWindow = String(body.timeWindow || "").trim().slice(0, 40);
  const question = String(body.question || "").trim().slice(0, 200);
  if (!name || !isValidPhone(phone) || !timeWindow) {
    return NextResponse.json({ error: "请填写称呼、手机号和方便时间" }, { status: 400 });
  }
  const session = await getSession();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  const appointment = await createCheckupAppointment({
    nameEnc: encrypt(name),
    phoneEnc: encrypt(phone),
    timeWindow,
    question,
    openid: session.userId ? String(session.userId) : "",
  });
  if (payload) await recordCheckupEvent(payload.sessionId, "booking_created", {});
  return NextResponse.json({ ok: true, id: appointment.id });
}
