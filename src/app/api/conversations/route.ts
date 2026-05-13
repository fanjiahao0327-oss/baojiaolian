import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get("status");
  const clientIdFilter = searchParams.get("client_id");

  const sql = getDb();
  let query = sql`SELECT c.id, c.title, c.messages, c.created_at, c.status, cl.name as client_name
    FROM conversations c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.user_id = ${session.userId}`;

  if (statusFilter) {
    query = sql`${query} AND c.status = ${statusFilter}`;
  }
  if (clientIdFilter) {
    query = sql`${query} AND c.client_id = ${Number(clientIdFilter)}`;
  }

  query = sql`${query} ORDER BY c.updated_at DESC LIMIT 50`;

  const rows = await query;

  const list = (rows as { id: number; title: string; messages: string; created_at: string; status: string; client_name: string | null }[]).map((row) => {
    const msgs = JSON.parse(row.messages);
    const firstUserMsg = msgs.find((m: { role: string }) => m.role === "user");
    const preview = firstUserMsg
      ? firstUserMsg.content.replace(/\n/g, " ").slice(0, 60)
      : "";
    return {
      id: row.id,
      title: row.title || "未命名对话",
      preview,
      created_at: row.created_at,
      status: row.status,
      client_name: row.client_name,
    };
  });

  return NextResponse.json(list);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !["active", "won", "lost"].includes(status)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const sql = getDb();
  const checkRows = await sql`SELECT id FROM conversations WHERE id = ${Number(id)} AND user_id = ${session.userId}`;
  if (rows(checkRows).length === 0) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  await sql`UPDATE conversations SET status = ${status} WHERE id = ${Number(id)}`;
  return NextResponse.json({ success: true });
}
