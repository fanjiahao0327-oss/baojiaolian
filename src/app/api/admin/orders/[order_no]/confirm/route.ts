import { NextRequest, NextResponse } from "next/server";
import { getDb, rows } from "@/lib/db";
import { getBalance } from "@/lib/points";

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

  const result = await sql`SELECT id, user_id, points, status FROM payment_orders WHERE order_no = ${order_no}`;
  const order = rows<{ id: number; user_id: number; points: number; status: string }>(result)[0];
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  if (order.status === "paid") {
    return NextResponse.json({ message: "已处理", order_no });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ error: "订单状态不允许确认" }, { status: 400 });
  }

  await sql`BEGIN`;
  const updated = await sql`
    UPDATE payment_orders SET status = 'paid', paid_at = NOW()
    WHERE id = ${order.id} AND status = 'pending' RETURNING id
  `;
  if (rows(updated).length === 0) {
    await sql`ROLLBACK`;
    return NextResponse.json({ message: "已被其他管理员处理" });
  }

  await sql`
    INSERT INTO point_transactions (user_id, amount, type, description)
    VALUES (${order.user_id}, ${order.points}, 'charge', ${`购买 ${order.points} 积分 (${order_no})`})
  `;
  await sql`COMMIT`;

  const balance = await getBalance(order.user_id);

  return NextResponse.json({ success: true, points: order.points, balance });
}
