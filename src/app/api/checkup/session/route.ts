import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/checkup/session";
import { recordCheckupEvent } from "@/lib/checkup/store";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:session:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const sessionId = crypto.randomUUID();
  await recordCheckupEvent(sessionId, "session_start");

  return NextResponse.json({
    sessionToken: createSessionToken(sessionId),
    opening:
      "先说说：你为什么现在想了解保险？最近有没有发生什么事，或者你心里一直有个担心？不用组织语言，想到哪说到哪，说个大概就行。",
    topics: ["生病/医疗", "孩子教育", "退休养老", "孩子婚姻/传承", "企业债务/家企", "婚姻财产"],
  });
}
