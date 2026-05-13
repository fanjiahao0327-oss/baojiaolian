import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, row } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const sql = getDb();
  const rows = await sql`SELECT id, name, updated_at FROM clients WHERE user_id = ${session.userId} ORDER BY updated_at DESC`;

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { name, kycSnapshot } = body;

  const sql = getDb();
  const result = await sql`INSERT INTO clients (user_id, name, kyc_snapshot) VALUES (${session.userId}, ${name || "未命名客户"}, ${encrypt(JSON.stringify(kycSnapshot || {}))}) RETURNING id`;

  return NextResponse.json({ id: Number(row<{ id: number }>(result).id) }, { status: 201 });
}
