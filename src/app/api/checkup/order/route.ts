import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { verifySessionToken } from "@/lib/checkup/session";
import { createCheckupOrder, recordCheckupEvent } from "@/lib/checkup/store";
import { createJSAPIPrepay, generatePayParams } from "@/lib/wechatpay";
import { rateLimit } from "@/lib/rate-limit";
import { isCheckupDemoMode } from "@/lib/checkup/demo";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const isMock = Boolean(body.mock) && isCheckupDemoMode();
  const session = await getSession();
  if (!session.userId && !isMock) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const rl = rateLimit(`checkup:order:${session.userId ?? "mock"}`, "payment");
  if (!rl.allowed) return NextResponse.json({ error: "操作过于频繁" }, { status: 429 });

  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  let openid = "mock-openid";
  if (session.userId) {
    const sql = getDb();
    const userRows = await sql`SELECT wechat_openid FROM users WHERE id = ${session.userId}`;
    openid = rows<{ wechat_openid: string | null }>(userRows)[0]?.wechat_openid || "";
    if (!openid && !isMock) {
      return NextResponse.json({ error: "缺少微信身份" }, { status: 400 });
    }
    if (!openid) openid = "mock-openid";
  }

  const order = await createCheckupOrder({ openid, sessionId: payload.sessionId });
  await recordCheckupEvent(payload.sessionId, "order_created");

  // 本地开发：不下真实预支付单，只创建订单，由 /api/checkup/pay/mock 标记已支付
  if (isMock) {
    return NextResponse.json({ orderNo: order.order_no, mock: true });
  }

  const prepay = await createJSAPIPrepay({
    openid,
    description: "AI家庭风险测评报告",
    outTradeNo: order.order_no,
    amountCents: 100,
    notifyUrl: "https://baojiaolian.com.cn/api/checkup/pay/notify",
  });
  return NextResponse.json({ orderNo: order.order_no, payParams: generatePayParams(prepay.prepay_id) });
}
