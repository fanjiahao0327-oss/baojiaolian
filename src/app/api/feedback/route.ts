import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { conversationId, messageIdx, rating } = await request.json();

  if (!["helpful", "unhelpful"].includes(rating)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const sql = getDb();

  // 验证对话归属
  if (conversationId) {
    const convRows = await sql`SELECT id FROM conversations WHERE id = ${Number(conversationId)} AND user_id = ${session.userId}`;
    if (rows(convRows).length === 0) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 });
    }
  }

  await sql`INSERT INTO feedbacks (user_id, conversation_id, message_idx, rating) VALUES (${session.userId}, ${conversationId || null}, ${messageIdx ?? -1}, ${rating})`;

  return NextResponse.json({ success: true });
}
