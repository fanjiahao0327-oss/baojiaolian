import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
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

  if (!phone || !/^1\d{10}$/.test(phone)) {
    if (isJson) return NextResponse.json({ error: "请输入正确的手机号" }, { status: 400 });
    return NextResponse.redirect(new URL("/login?error=请输入正确的手机号", request.url), 302);
  }

  if (code !== "1234") {
    if (isJson) return NextResponse.json({ error: "验证码错误" }, { status: 400 });
    return NextResponse.redirect(new URL("/login?error=验证码错误", request.url), 302);
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

  // 使用 App Router API 设置 session cookie
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.userId = userId;
  session.phone = phone;
  await session.save();

  if (isJson) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.redirect(new URL("/", request.url), 302);
}
