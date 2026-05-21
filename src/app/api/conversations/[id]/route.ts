import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { markdownToRichHTML, extractSuggestedQuestions } from "@/lib/markdown";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId) || numId <= 0) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const sql = getDb();
  const convRows = await sql`SELECT id, title, messages, client_id, total_input_tokens, total_output_tokens, created_at FROM conversations WHERE id = ${numId} AND user_id = ${session.userId}`;
  if (rows(convRows).length === 0) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
  const row = rows<{ id: number; title: string; messages: string; client_id: number | null; total_input_tokens: number; total_output_tokens: number; created_at: string }>(convRows)[0];

  const messages: unknown[] = JSON.parse(row.messages);
  // 将 coach 消息的 markdown 转为 HTML（适配小程序 rich-text），同时保留原始 markdown
  const convertedMessages = (messages as { role: string; content: string; timestamp: number }[]).map((msg) => {
    if (msg.role === "coach" && msg.content) {
      const html = markdownToRichHTML(msg.content);
      const { html: cleanHTML } = extractSuggestedQuestions(html);
      return { ...msg, contentHtml: cleanHTML };
    }
    return msg;
  });

  return NextResponse.json({
    id: row.id,
    title: row.title,
    messages: convertedMessages,
    clientId: row.client_id,
    total_input_tokens: row.total_input_tokens,
    total_output_tokens: row.total_output_tokens,
    created_at: row.created_at,
  });
}
