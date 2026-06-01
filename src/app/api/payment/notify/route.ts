import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, rows } from "@/lib/db";
import { decryptNotify, verifyNotifySign } from "@/lib/wechatpay";

/** 处理充值积分（事务保护） */
async function creditOrder(outTradeNo: string, transactionId: string) {
  const sql = getDb();
  const existing = await sql`SELECT id, user_id, points, status FROM payment_orders WHERE order_no = ${outTradeNo}`;
  const existingRows = rows<{ id: number; user_id: number; points: number; status: string }>(existing);

  if (existingRows.length === 0) {
    console.error("[notify] order not found:", outTradeNo);
    return { ok: false, reason: "订单不存在" };
  }

  const orderRow = existingRows[0];
  if (orderRow.status === "paid") {
    return { ok: true, reason: "already paid" };
  }

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
    return { ok: true, reason: "concurrent" };
  }
  await sql`
    INSERT INTO point_transactions (user_id, amount, type, description)
    VALUES (${orderRow.user_id}, ${points}, 'charge', ${"充值 " + points + " 积分（支付回调 " + transactionId + "）"})
  `;
  await sql`COMMIT`;

  console.log(`[notify] charged ${points} points to user ${orderRow.user_id}`);
  return { ok: true };
}

/**
 * 验证 Midas 虚拟支付回调签名
 *
 * Midas 回调的签名方式与 pay_sig 生成方式一致：
 * 将回调参数（排除 sign）按 key 排序后拼成字符串，
 * 末尾拼接 &key=<appkey>，做 HMAC-SHA256 对比。
 */
function verifyMidasSign(params: Record<string, string>, appkey: string): boolean {
  const { sign, ...rest } = params;
  if (!sign) return false;

  const sortedKeys = Object.keys(rest).sort();
  const signStr =
    sortedKeys.map((k) => `${k}=${rest[k]}`).join("&") + `&key=${appkey}`;

  const computed = crypto.createHmac("sha256", appkey).update(signStr).digest("hex");
  return computed === sign;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 微信支付标准回调（JSON body + 微信签名头）
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { resource, event_type } = body;

      // 仅处理支付成功通知
      if (event_type !== "TRANSACTION.SUCCESS") {
        return NextResponse.json({ code: "SUCCESS", message: "OK" });
      }

      // 验签
      const timestamp = request.headers.get("wechatpay-timestamp") || "";
      const nonce = request.headers.get("wechatpay-nonce") || "";
      const signature = request.headers.get("wechatpay-signature") || "";

      const bodyRaw = JSON.stringify(body);
      if (!verifyNotifySign(timestamp, nonce, bodyRaw, signature)) {
        console.error("[notify] wechatpay signature verification failed");
        return NextResponse.json({ code: "FAIL", message: "验签失败" }, { status: 400 });
      }

      // 解密 resource
      const { ciphertext, associated_data, nonce: resNonce } = resource;
      const decrypted = decryptNotify(ciphertext, associated_data || "", resNonce);
      const order = JSON.parse(decrypted);

      const outTradeNo = order.out_trade_no as string;
      const transactionId = order.transaction_id as string;

      if (order.trade_state !== "SUCCESS") {
        return NextResponse.json({ code: "SUCCESS", message: "OK" });
      }

      const result = await creditOrder(outTradeNo, transactionId);
      if (!result.ok) {
        return NextResponse.json({ code: "FAIL", message: result.reason }, { status: 400 });
      }
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 虚拟支付 Midas 回调（form-urlencoded）
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params: Record<string, string> = {};
      new URLSearchParams(text).forEach((v, k) => {
        params[k] = v;
      });

      const appkey =
        process.env.WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION ||
        process.env.WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX ||
        "";

      if (!verifyMidasSign(params, appkey)) {
        console.error("[notify] midas signature verification failed");
        return NextResponse.json({ code: "FAIL", message: "验签失败" }, { status: 400 });
      }

      const outTradeNo = params.out_trade_no;
      const transactionId = params.transaction_id || params.midas_trade_no || "";
      const tradeState = params.trade_state || "";

      if (tradeState && tradeState !== "0" && tradeState !== "SUCCESS") {
        return NextResponse.json({ code: "SUCCESS", message: "OK" });
      }

      if (!outTradeNo) {
        console.error("[notify] missing out_trade_no in midas callback");
        return NextResponse.json({ code: "FAIL", message: "缺少订单号" }, { status: 400 });
      }

      const result = await creditOrder(outTradeNo, transactionId);
      if (!result.ok && result.reason !== "already paid") {
        return NextResponse.json({ code: "FAIL", message: result.reason }, { status: 400 });
      }
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // 未知回调格式
    console.error("[notify] unknown content-type:", contentType);
    return NextResponse.json({ code: "FAIL", message: "不支持的回调格式" }, { status: 400 });
  } catch (e) {
    console.error("[notify] error:", e);
    return NextResponse.json({ code: "FAIL", message: "处理失败" }, { status: 500 });
  }
}
