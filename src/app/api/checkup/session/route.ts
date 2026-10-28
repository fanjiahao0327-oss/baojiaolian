import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/checkup/session";
import { recordCheckupEvent } from "@/lib/checkup/store";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:session:${ip}`, "coach");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const sessionId = crypto.randomUUID();
  await recordCheckupEvent(sessionId, "session_start");

  return NextResponse.json({
    sessionToken: createSessionToken(sessionId),
    opening: "你家现在最让你不踏实的是什么？可以先随便说几句，不用想得很完整。",
    topics: ["钱够不够花", "生病怎么办", "孩子教育", "父母养老", "家业传承"],
  });
}
