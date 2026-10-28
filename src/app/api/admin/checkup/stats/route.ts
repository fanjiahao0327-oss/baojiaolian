import { NextRequest, NextResponse } from "next/server";
import { isAdminKeyValid } from "@/lib/security";
import { getDb, rows } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isAdminKeyValid(request.headers.get("x-admin-key"))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sql = getDb();
  const events = rows<{ event_name: string; count: number }>(
    await sql`SELECT event_name, COUNT(*)::int AS count FROM checkup_events GROUP BY event_name ORDER BY count DESC`,
  );
  const orders = rows<{ status: string; count: number }>(
    await sql`SELECT status, COUNT(*)::int AS count FROM checkup_orders GROUP BY status`,
  );
  return NextResponse.json({ events, orders });
}
