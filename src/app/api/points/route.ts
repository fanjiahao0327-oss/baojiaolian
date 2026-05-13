import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const sql = getDb();
  const transactions = await sql`SELECT id, amount, type, description, created_at FROM point_transactions WHERE user_id = ${session.userId} ORDER BY created_at DESC LIMIT 50`;

  return NextResponse.json({
    balance: await getBalance(session.userId),
    transactions,
  });
}
