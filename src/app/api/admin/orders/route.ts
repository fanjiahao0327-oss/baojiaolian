import { NextRequest, NextResponse } from "next/server";
import { getDb, rows } from "@/lib/db";

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  const configuredKey = process.env.ADMIN_KEY;
  if (!configuredKey || adminKey !== configuredKey) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const sql = getDb();
  const result = await sql`
    SELECT po.id, po.order_no, po.points, po.amount_cents, po.status,
           po.payment_method, po.payment_ref, po.created_at,
           u.phone
    FROM payment_orders po
    JOIN users u ON u.id = po.user_id
    WHERE po.status = 'pending'
    ORDER BY po.created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ orders: rows(result) });
}
