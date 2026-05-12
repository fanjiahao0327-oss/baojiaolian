import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
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
  const db = getDb();
  const row = db
    .prepare("SELECT id, title, messages, created_at FROM conversations WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as { id: number; title: string; messages: string; created_at: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages),
    created_at: row.created_at,
  });
}
