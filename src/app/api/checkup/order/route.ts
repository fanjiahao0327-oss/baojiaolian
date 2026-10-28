import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { verifySessionToken } from "@/lib/checkup/session";
import { createCheckupOrder, recordCheckupEvent } from "@/lib/checkup/store";
import { createJSAPIPrepay, generatePayParams } from "@/lib/wechatpay";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const rl = rateLimit(`checkup:order:${session.userId}`, "payment");
  if (!rl.allowed) return NextResponse.json({ error: "操作过于频繁" }, { status: 429 });

  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT wechat_openid FROM users WHERE id = ${session.userId}`;
  const openid = rows<{ wechat_openid: string | null }>(userRows)[0]?.wechat_openid;
  if (!openid) return NextResponse.json({ error: "缺少微信身份" }, { status: 400 });

  const order = await createCheckupOrder({ openid, sessionId: payload.sessionId });
  await recordCheckupEvent(payload.sessionId, "order_created");
  const prepay = await createJSAPIPrepay({
    openid,
    description: "AI家庭风险测评报告",
    outTradeNo: order.order_no,
    amountCents: 100,
    notifyUrl: "https://baojiaolian.com.cn/api/checkup/pay/notify",
  });
  return NextResponse.json({ orderNo: order.order_no, payParams: generatePayParams(prepay.prepay_id) });
}
