import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

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

  const sql = getDb();
  const checkRows = await sql`SELECT id FROM clients WHERE id = ${Number(id)} AND user_id = ${session.userId}`;
  if (rows(checkRows).length === 0) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  if (name !== undefined) {
    await sql`UPDATE clients SET name = ${name}, updated_at = NOW() WHERE id = ${Number(id)}`;
  }
  if (kycSnapshot !== undefined) {
    await sql`UPDATE clients SET kyc_snapshot = ${encrypt(JSON.stringify(kycSnapshot))}, updated_at = NOW() WHERE id = ${Number(id)}`;
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
  const sql = getDb();
  const clientRows = await sql`SELECT id, name, kyc_snapshot, created_at, updated_at FROM clients WHERE id = ${Number(id)} AND user_id = ${session.userId}`;
  if (rows(clientRows).length === 0) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }
  const client = rows(clientRows)[0];

  const conversations = await sql`SELECT id, title, created_at FROM conversations WHERE client_id = ${Number(id)} AND user_id = ${session.userId} ORDER BY created_at DESC`;

  let kycSnapshot: Record<string, unknown> = {};
  try {
    const raw = decrypt(client.kyc_snapshot as string);
    kycSnapshot = JSON.parse(raw);
  } catch {
    kycSnapshot = {};
  }

  const { kyc_snapshot: _, ...rest } = client;
  return NextResponse.json({ ...rest, kyc_snapshot: kycSnapshot, conversations });
}
