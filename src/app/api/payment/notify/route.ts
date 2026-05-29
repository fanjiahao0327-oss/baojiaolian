import { NextRequest, NextResponse } from "next/server";
import { getDb, rows } from "@/lib/db";
import { decryptNotify, verifyNotifySign } from "@/lib/wechatpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, create_time, resource, event_type } = body;

    // 仅处理支付成功通知
    if (event_type !== "TRANSACTION.SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 验签
    const timestamp = request.headers.get("wechatpay-timestamp") || "";
    const nonce = request.headers.get("wechatpay-nonce") || "";
    const signature = request.headers.get("wechatpay-signature") || "";
    const serial = request.headers.get("wechatpay-serial") || "";

    const bodyRaw = JSON.stringify(body);
    if (!verifyNotifySign(timestamp, nonce, bodyRaw, signature)) {
      console.error("[notify] signature verification failed");
      return NextResponse.json({ code: "FAIL", message: "验签失败" }, { status: 400 });
    }

    // 解密 resource
    const { ciphertext, associated_data, nonce: resNonce } = resource;
    const decrypted = decryptNotify(ciphertext, associated_data || "", resNonce);
    const order = JSON.parse(decrypted);

    const outTradeNo = order.out_trade_no as string;
    const transactionId = order.transaction_id as string;
    const tradeState = order.trade_state as string;

    console.log("[notify] order:", outTradeNo, "status:", tradeState, "transaction:", transactionId);

    if (tradeState !== "SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 更新订单状态 & 充值积分
    const sql = getDb();
    const existing = await sql`SELECT id, user_id, points, status FROM payment_orders WHERE order_no = ${outTradeNo}`;
    const existingRows = rows<{ id: number; user_id: number; points: number; status: string }>(existing);

    if (existingRows.length === 0) {
      console.error("[notify] order not found:", outTradeNo);
      return NextResponse.json({ code: "FAIL", message: "订单不存在" }, { status: 400 });
    }

    const orderRow = existingRows[0];
    if (orderRow.status === "paid") {
      // 幂等：已支付的直接返回成功
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 更新订单并充值积分（事务保护，防止订单标记已付但积分未到账）
    const points = orderRow.points;
    await sql`BEGIN`;
    const updated = await sql`
      UPDATE payment_orders SET status = 'paid', payment_ref = ${transactionId}, updated_at = NOW()
      WHERE order_no = ${outTradeNo} AND status = 'pending'
      RETURNING id
    `;
    if (rows(updated).length === 0) {
      await sql`ROLLBACK`;
      console.log(`[notify] order ${outTradeNo} already processed by concurrent request`);
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }
    await sql`
      INSERT INTO point_transactions (user_id, amount, type, description)
      VALUES (${orderRow.user_id}, ${points}, 'charge', ${'充值 ' + points + ' 积分（微信支付 ' + transactionId + '）'})
    `;
    await sql`COMMIT`;

    console.log(`[notify] charged ${points} points to user ${orderRow.user_id}`);

    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  } catch (e) {
    console.error("[notify] error:", e);
    return NextResponse.json({ code: "FAIL", message: "处理失败" }, { status: 500 });
  }
}
