import { NextRequest, NextResponse } from "next/server";
import { getDb, rows } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_no: string }> }
) {
  const adminKey = request.headers.get("x-admin-key");
  const configuredKey = process.env.ADMIN_KEY;
  if (!configuredKey || adminKey !== configuredKey) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { order_no } = await params;
  const sql = getDb();

  const result = await sql`SELECT id, status FROM payment_orders WHERE order_no = ${order_no}`;
  const order = rows<{ id: number; status: string }>(result)[0];
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ error: "订单状态不允许取消" }, { status: 400 });
  }

  await sql`UPDATE payment_orders SET status = 'cancelled' WHERE id = ${order.id}`;

  return NextResponse.json({ success: true, order_no });
}
