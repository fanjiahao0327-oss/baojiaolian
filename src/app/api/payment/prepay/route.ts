import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { getPackageByPoints } from "@/lib/pricing";
import { prepareVirtualPaymentParams, isVirtualPayConfigured } from "@/lib/midas";
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

  if (!isVirtualPayConfigured()) {
    return NextResponse.json({
      virtualPayParams: null,
      message: "小程序虚拟支付暂未开通，请完成微信官方虚拟支付配置后再发起购买。",
    }, { status: 503 });
  }

  const rl = rateLimit(`payment:${userId}`, "payment");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `操作过于频繁，请 ${rl.resetIn} 秒后再试` },
      { status: 429 }
    );
  }

  try {
    const { points } = await request.json();
    const pkg = getPackageByPoints(Number(points));
    if (!pkg) {
      return NextResponse.json({ error: "无效的积分包" }, { status: 400 });
    }

    // 获取 openid
    const sql = getDb();
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_session_key TEXT`;
    const userRows = await sql`SELECT wechat_openid, wechat_session_key FROM users WHERE id = ${userId}`;
    const user = rows<{ wechat_openid: string | null; wechat_session_key: string | null }>(userRows)[0];
    if (!user?.wechat_openid) {
      return NextResponse.json({ error: "请先绑定微信" }, { status: 400 });
    }

    const sessionKey = session.sessionKey || user.wechat_session_key;
    if (!sessionKey) {
      return NextResponse.json({ error: "请重新登录微信后再购买" }, { status: 401 });
    }

    const orderNo = genOrderNo();

    await sql`
      INSERT INTO payment_orders (user_id, order_no, points, amount_cents, payment_method, status)
      VALUES (${userId}, ${orderNo}, ${pkg.points}, ${pkg.amountCents}, 'virtual_pay', 'pending')
    `;

    const vp = prepareVirtualPaymentParams({
      sessionKey,
      outTradeNo: orderNo,
      buyQuantity: 1,
      productId: pkg.id,
      goodsPrice: pkg.amountCents,
      attach: orderNo,
      // env 由 midas.ts 内部根据 WECHAT_VIRTUAL_PAY_ENV 决定
    });

    await sql`
      UPDATE payment_orders SET payment_ref = ${"VP-" + orderNo}, updated_at = NOW()
      WHERE order_no = ${orderNo}
    `;

    const balance = await getBalance(userId);

    return NextResponse.json({
      orderNo,
      virtualPayParams: vp,
      points: pkg.points,
      amountYuan: (pkg.amountCents / 100).toFixed(2),
      balance,
    });
  } catch (e) {
    const err = e as Error & { code?: string; status?: number };
    console.error(
      "[prepay] error:",
      err.name,
      err.message,
      "code:",
      err.code,
      "status:",
      err.status
    );
    return NextResponse.json(
      { error: "创建支付订单失败: " + (err.message || "") },
      { status: 500 }
    );
  }
}
