import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { INITIAL_POINTS } from "@/lib/points";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // 按 IP 限频：每分钟 5 次
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`login:ip:${ip}`, "login");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `登录尝试过于频繁，请 ${rl.resetIn} 秒后再试` },
      { status: 429 }
    );
  }

  try {
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

    if (isJson) {
      const response = NextResponse.json({ success: true });
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      session.userId = userId;
      session.phone = phone;
      await session.save();
      return response;
    }

    const response = NextResponse.redirect(new URL("/", request.url), 302);
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.userId = userId;
    session.phone = phone;
    await session.save();
    return response;
  } catch (err) {
    console.error("[login] error:", err);
    const message = process.env.NODE_ENV === "development"
      ? `服务器错误: ${err instanceof Error ? err.message : String(err)}`
      : "服务器错误，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
