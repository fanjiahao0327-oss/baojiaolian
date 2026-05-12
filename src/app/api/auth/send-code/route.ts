import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { phone } = await request.json();

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "请输入正确的手机号" }, { status: 400 });
  }

  // 开发环境固定返回成功，验证码为 1234
  return NextResponse.json({ success: true });
}
