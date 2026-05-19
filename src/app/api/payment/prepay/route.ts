import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows, row } from "@/lib/db";
import { getPackageByPoints } from "@/lib/pricing";
import { createJSAPIPrepay, generatePayParams } from "@/lib/wechatpay";
import { rateLimit } from "@/lib/rate-limit";
import { getBalance } from "@/lib/points";

function genOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const uid = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `PO-${date}-${uid}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.userId;

  const rl = rateLimit(`payment:${userId}`, "payment");
  if (!rl.allowed) {
    return NextResponse.json({ error: `操作过于频繁，请 ${rl.resetIn} 秒后再试` }, { status: 429 });
  }

  try {
    const { points } = await request.json();
    const pkg = getPackageByPoints(Number(points));
    if (!pkg) {
      return NextResponse.json({ error: "无效的积分包" }, { status: 400 });
    }

    // 获取 openid
    const sql = getDb();
    const userRows = await sql`SELECT wechat_openid FROM users WHERE id = ${userId}`;
    const user = rows<{ wechat_openid: string | null }>(userRows)[0];
    if (!user?.wechat_openid) {
      return NextResponse.json({ error: "请先绑定微信" }, { status: 400 });
    }

    const orderNo = genOrderNo();

    // 创建本地订单
    await sql`
      INSERT INTO payment_orders (user_id, order_no, points, amount_cents, payment_method, status)
      VALUES (${userId}, ${orderNo}, ${pkg.points}, ${pkg.amountCents}, 'wechat', 'pending')
    `;

    // 创建微信预支付订单
    const { prepay_id } = await createJSAPIPrepay({
      openid: user.wechat_openid,
      description: `${pkg.points} 积分`,
      outTradeNo: orderNo,
      amountCents: pkg.amountCents,
    });

    // 记录 prepay_id
    await sql`
      UPDATE payment_orders SET payment_ref = ${prepay_id}, updated_at = NOW()
      WHERE order_no = ${orderNo}
    `;

    // 生成调起支付参数
    const payParams = generatePayParams(prepay_id);
    const balance = await getBalance(userId);

    return NextResponse.json({
      orderNo,
      payParams,
      points: pkg.points,
      amountYuan: (pkg.amountCents / 100).toFixed(2),
      balance,
    });
  } catch (e) {
    console.error("[prepay] error:", e);
    return NextResponse.json({ error: "创建支付订单失败" }, { status: 500 });
  }
}
