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

  const rl = rateLimit(`points:${session.userId}`, "points");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `操作过于频繁，请 ${rl.resetIn} 秒后再试` },
      { status: 429 }
    );
  }

  const { amount, adminKey } = await request.json();

  const configuredKey = process.env.ADMIN_KEY;
  if (!configuredKey) {
    return NextResponse.json(
      { error: "充值功能暂未开放" },
      { status: 403 }
    );
  }
  if (!adminKey || adminKey !== configuredKey) {
    return NextResponse.json(
      { error: "无权操作，请联系管理员" },
      { status: 403 }
    );
  }

  const parsed = parseInt(amount, 10);
  if (!parsed || parsed <= 0 || parsed > 100) {
    return NextResponse.json({ error: "充值数量需在 1-100 之间" }, { status: 400 });
  }

  const sql = getDb();
  await sql`INSERT INTO point_transactions (user_id, amount, type, description) VALUES (${session.userId}, ${parsed}, 'charge', ${`充值 ${parsed} 积分`})`;

  return NextResponse.json({ balance: await getBalance(session.userId) });
}
