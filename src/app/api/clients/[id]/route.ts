import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, kycSnapshot } = body;

  const db = getDb();
  const client = db
    .prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?")
    .get(Number(id), session.userId);

  if (!client) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  if (name !== undefined) {
    db.prepare("UPDATE clients SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name, Number(id));
  }
  if (kycSnapshot !== undefined) {
    db.prepare("UPDATE clients SET kyc_snapshot = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(kycSnapshot), Number(id));
  }

  return NextResponse.json({ success: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const client = db
    .prepare("SELECT id, name, kyc_snapshot, created_at, updated_at FROM clients WHERE id = ? AND user_id = ?")
    .get(Number(id), session.userId);

  if (!client) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  const conversations = db
    .prepare("SELECT id, title, created_at FROM conversations WHERE client_id = ? AND user_id = ? ORDER BY created_at DESC")
    .all(Number(id), session.userId);

  // 在服务端解析 kyc_snapshot，避免客户端 JSON.parse 失败
  let kycSnapshot: Record<string, unknown> = {};
  try {
    kycSnapshot = JSON.parse((client as Record<string, unknown>).kyc_snapshot as string);
  } catch {
    kycSnapshot = {};
  }

  const { kyc_snapshot: _, ...rest } = client as Record<string, unknown>;
  return NextResponse.json({ ...rest, kyc_snapshot: kycSnapshot, conversations });
}
