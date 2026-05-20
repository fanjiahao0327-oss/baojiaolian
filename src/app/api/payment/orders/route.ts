import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { getBalance } from "@/lib/points";
import { getPackageByPoints } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";

function genOrderNo(): string {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var result = "";
  for (var i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  var date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return "PO-" + date + "-" + result;
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const sql = getDb();
  const result = await sql`
    SELECT order_no, points, amount_cents, status, payment_method, payment_ref, created_at
    FROM payment_orders WHERE user_id = ${session.userId}
    ORDER BY created_at DESC LIMIT 20
  `;
  return NextResponse.json({ orders: rows(result) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.userId;

  const rl = rateLimit(`payment:${userId}`, "payment");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `操作过于频繁，请 ${rl.resetIn} 秒后再试` },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { points, payment_method = "wechat" } = body;

  const pkg = getPackageByPoints(Number(points));
  if (!pkg) {
    return NextResponse.json({ error: "无效的积分包" }, { status: 400 });
  }
  if (!["wechat", "alipay"].includes(payment_method)) {
    return NextResponse.json({ error: "无效的支付方式" }, { status: 400 });
  }

  const sql = getDb();
  const orderNo = genOrderNo();

  await sql`
    INSERT INTO payment_orders (user_id, order_no, points, amount_cents, payment_method)
    VALUES (${userId}, ${orderNo}, ${pkg.points}, ${pkg.amountCents}, ${payment_method})
  `;

  const balance = await getBalance(userId);

  return NextResponse.json({
    order_no: orderNo,
    points: pkg.points,
    amount_cents: pkg.amountCents,
    amount_yuan: (pkg.amountCents / 100).toFixed(2),
    payment_method,
    balance,
  });
}
