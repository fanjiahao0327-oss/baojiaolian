import { NextRequest, NextResponse } from "next/server";
import { markCheckupOrderPaid } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { orderNo } = await request.json();
  await markCheckupOrderPaid(String(orderNo), "mock");
  return NextResponse.json({ ok: true });
}
