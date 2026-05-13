import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();
  const convRows = await sql`SELECT id, title, messages, created_at FROM conversations WHERE id = ${Number(id)} AND user_id = ${session.userId}`;
  if (rows(convRows).length === 0) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
  const row = rows<{ id: number; title: string; messages: string; created_at: string }>(convRows)[0];

  return NextResponse.json({
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages),
    created_at: row.created_at,
  });
}
