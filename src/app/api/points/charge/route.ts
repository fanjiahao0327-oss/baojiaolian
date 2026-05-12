import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 按用户限频：每分钟 10 次
  const rl = rateLimit(`points:${session.userId}`, "points");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `操作过于频繁，请 ${rl.resetIn} 秒后再试` },
      { status: 429 }
    );
  }

  const { amount } = await request.json();
  const parsed = parseInt(amount, 10);
  if (!parsed || parsed <= 0 || parsed > 10000) {
    return NextResponse.json({ error: "充值数量需在 1-10000 之间" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'charge', ?)").run(
    session.userId,
    parsed,
    `充值 ${parsed} 积分`
  );

  return NextResponse.json({ balance: getBalance(session.userId) });
}
