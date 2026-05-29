import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { queryOrderByOutTradeNo } from "@/lib/wechatpay";
import { getBalance } from "@/lib/points";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderNo } = await request.json();
  if (!orderNo) {
    return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
  }

  const sql = getDb();

  // 查询本地订单
  const orders = rows<{ id: number; user_id: number; points: number; status: string; payment_ref: string }>(
    await sql`SELECT id, user_id, points, status, payment_ref FROM payment_orders WHERE order_no = ${orderNo}`
  );

  if (orders.length === 0) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const order = orders[0];
  if (order.user_id !== session.userId) {
    return NextResponse.json({ error: "无权操作该订单" }, { status: 403 });
  }

  if (order.status === "paid") {
    return NextResponse.json({ status: "paid", balance: await getBalance(session.userId) });
  }

  // 向微信查询订单状态
  const wxOrder = await queryOrderByOutTradeNo(orderNo);
  if (!wxOrder) {
    return NextResponse.json({ error: "查询支付状态失败，请稍后重试" }, { status: 502 });
  }

  if (wxOrder.tradeState !== "SUCCESS") {
    return NextResponse.json({ status: wxOrder.tradeState, balance: await getBalance(session.userId) });
  }

  // 更新订单并充值积分（事务保护）
  const transactionId = wxOrder.transactionId || "";
  await sql`BEGIN`;
  const updated = await sql`
    UPDATE payment_orders SET status = 'paid', payment_ref = ${transactionId}, updated_at = NOW()
    WHERE order_no = ${orderNo} AND status = 'pending'
    RETURNING id
  `;
  if (rows(updated).length === 0) {
    await sql`ROLLBACK`;
    const balance2 = await getBalance(session.userId);
    return NextResponse.json({ status: "paid", balance: balance2 });
  }
  await sql`
    INSERT INTO point_transactions (user_id, amount, type, description)
    VALUES (${session.userId}, ${order.points}, 'charge', ${"充值 " + order.points + " 积分（微信支付 " + transactionId + "）"})
  `;
  await sql`COMMIT`;

  const balance = await getBalance(session.userId);
  return NextResponse.json({ status: "paid", points: order.points, balance });
}
