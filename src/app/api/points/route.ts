import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const db = getDb();
  const transactions = db
    .prepare("SELECT id, amount, type, description, created_at FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(session.userId);

  return NextResponse.json({
    balance: getBalance(session.userId),
    transactions,
  });
}
