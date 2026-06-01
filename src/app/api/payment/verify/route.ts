import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { queryOrderByOutTradeNo } from "@/lib/wechatpay";
import { getBalance } from "@/lib/points";

/** 处理充值积分（事务保护） */
async function creditOrder(userId: number, orderNo: string, transactionId: string) {
  const sql = getDb();
  const orders = rows<{ id: number; points: number; status: string }>(
    await sql`SELECT id, points, status FROM payment_orders WHERE order_no = ${orderNo} AND user_id = ${userId}`
  );
  if (orders.length === 0) return false;

  const order = orders[0];
  if (order.status === "paid") return true;

  await sql`BEGIN`;
  const updated = await sql`
    UPDATE payment_orders SET status = 'paid', payment_ref = ${transactionId || "confirmed"}, updated_at = NOW()
    WHERE id = ${order.id} AND status = 'pending'
    RETURNING id
  `;
  if (rows(updated).length === 0) {
    await sql`ROLLBACK`;
    return true; // 幂等
  }
  await sql`
    INSERT INTO point_transactions (user_id, amount, type, description)
    VALUES (${userId}, ${order.points}, 'charge', ${"充值 " + order.points + " 积分（支付确认 " + transactionId + "）"})
  `;
  await sql`COMMIT`;
  return true;
}

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

  const orders = rows<{
    id: number;
    user_id: number;
    points: number;
    status: string;
    payment_ref: string;
    payment_method: string;
  }>(
    await sql`SELECT id, user_id, points, status, payment_ref, payment_method FROM payment_orders WHERE order_no = ${orderNo}`
  );

  if (orders.length === 0) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const order = orders[0];
  if (order.user_id !== session.userId) {
    return NextResponse.json({ error: "无权操作该订单" }, { status: 403 });
  }

  if (order.status === "paid") {
    return NextResponse.json({
      status: "paid",
      balance: await getBalance(session.userId),
    });
  }

  // 虚拟支付订单：payment_ref 以 "VP-" 开头
  if (order.payment_ref?.startsWith("VP-")) {
    await creditOrder(session.userId, orderNo, order.payment_ref || "vp-confirmed");
    const balance = await getBalance(session.userId);
    return NextResponse.json({ status: "paid", points: order.points, balance });
  }

  // 标准微信支付：向微信查询订单状态
  const wxOrder = await queryOrderByOutTradeNo(orderNo);
  if (!wxOrder) {
    return NextResponse.json(
      { error: "查询支付状态失败，请稍后重试" },
      { status: 502 }
    );
  }

  if (wxOrder.tradeState !== "SUCCESS") {
    return NextResponse.json({
      status: wxOrder.tradeState,
      balance: await getBalance(session.userId),
    });
  }

  const transactionId = wxOrder.transactionId || "";
  await creditOrder(session.userId, orderNo, transactionId);

  const balance = await getBalance(session.userId);
  return NextResponse.json({ status: "paid", points: order.points, balance });
}
