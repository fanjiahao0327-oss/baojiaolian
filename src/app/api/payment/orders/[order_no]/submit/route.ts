import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_no: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { order_no } = await params;
  const body = await request.json();
  const { payment_ref } = body;

  if (!payment_ref || !String(payment_ref).trim()) {
    return NextResponse.json({ error: "请输入交易单号" }, { status: 400 });
  }

  const sql = getDb();
  const result = await sql`
    SELECT id, status FROM payment_orders
    WHERE order_no = ${order_no} AND user_id = ${session.userId}
  `;
  const order = rows<{ id: number; status: string }>(result)[0];
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ error: "订单状态不允许提交" }, { status: 400 });
  }

  await sql`
    UPDATE payment_orders SET payment_ref = ${String(payment_ref).trim()}
    WHERE id = ${order.id}
  `;

  return NextResponse.json({ success: true });
}
