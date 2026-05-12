import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { INITIAL_POINTS } from "@/lib/points";

export async function POST(request: NextRequest) {
  let phone: string;
  let code: string;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    phone = body.phone;
    code = body.code;
  } else {
    const formData = await request.formData();
    phone = formData.get("phone") as string;
    code = formData.get("code") as string;
  }

  const isJson = contentType.includes("application/json");

  const makeErrorResponse = (error: string, status: number) => {
    if (isJson) return NextResponse.json({ error }, { status });
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, `${protocol}://${host}`), 302);
  };

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return makeErrorResponse("请输入正确的手机号", 400);
  }

  // 短信服务未接入前，统一用 1234 验证
  if (code !== "1234") {
    return makeErrorResponse("验证码错误", 400);
  }

  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone) as { id: number } | undefined;

  let userId: number;
  if (existing) {
    userId = existing.id;
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
  } else {
    const result = db.prepare("INSERT INTO users (phone) VALUES (?)").run(phone);
    userId = Number(result.lastInsertRowid);
    db.prepare("INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'charge', ?)").run(
      userId,
      INITIAL_POINTS,
      "新用户赠送积分"
    );
  }

  if (isJson) {
    return NextResponse.json({ success: true });
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  const response = NextResponse.redirect(new URL("/", `${protocol}://${host}`), 302);
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  session.userId = userId;
  session.phone = phone;
  await session.save();

  return response;
}
