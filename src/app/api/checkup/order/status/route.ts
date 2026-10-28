import { NextRequest, NextResponse } from "next/server";
import { getCheckupOrder } from "@/lib/checkup/store";

export async function GET(request: NextRequest) {
  const orderNo = request.nextUrl.searchParams.get("orderNo") || "";
  const order = await getCheckupOrder(orderNo);
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  return NextResponse.json({ status: order.status });
}
