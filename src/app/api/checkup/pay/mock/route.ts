import { NextRequest, NextResponse } from "next/server";
import { markCheckupOrderPaid } from "@/lib/checkup/store";
import { isCheckupDemoMode } from "@/lib/checkup/demo";

export async function POST(request: NextRequest) {
  if (!isCheckupDemoMode()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { orderNo } = await request.json();
  await markCheckupOrderPaid(String(orderNo), "mock");
  return NextResponse.json({ ok: true });
}
