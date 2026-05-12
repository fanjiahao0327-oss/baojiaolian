import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, updated_at FROM clients WHERE user_id = ? ORDER BY updated_at DESC")
    .all(session.userId);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { name, kycSnapshot } = body;

  const db = getDb();
  const result = db
    .prepare("INSERT INTO clients (user_id, name, kyc_snapshot) VALUES (?, ?, ?)")
    .run(session.userId, name || "未命名客户", JSON.stringify(kycSnapshot || {}));

  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
