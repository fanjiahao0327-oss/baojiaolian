import { getSession } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.userId,
    phone: session.phone,
    balance: getBalance(session.userId),
  });
}
