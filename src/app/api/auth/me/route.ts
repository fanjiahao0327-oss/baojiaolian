import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { getDb, rows } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 从 DB 读取 phone，因为小程序 Token 认证无法携带 session.phone
  const sql = getDb();
  const userRows = rows<{ phone: string | null }>(await sql`SELECT phone FROM users WHERE id = ${session.userId}`);
  const phone = userRows[0]?.phone || null;

  return NextResponse.json({
    userId: session.userId,
    phone,
    balance: await getBalance(session.userId),
  });
}
