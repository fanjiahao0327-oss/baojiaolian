import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
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
