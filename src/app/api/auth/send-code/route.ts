import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { phone } = await request.json();

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "请输入正确的手机号" }, { status: 400 });
  }

  // 按手机号 + IP 限制：每分钟 3 次
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rlPhone = rateLimit(`send-code:phone:${phone}`, "send-code");
  const rlIp = rateLimit(`send-code:ip:${ip}`, "send-code");
  if (!rlPhone.allowed || !rlIp.allowed) {
    return NextResponse.json(
      { error: "验证码发送过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  // 生产环境拒绝固定验证码，防止安全隐患
  if (process.env.NODE_ENV === "production" && !process.env.SMS_API_KEY) {
    return NextResponse.json(
      { error: "短信服务暂未开通，请联系管理员" },
      { status: 503 }
    );
  }

  // 开发环境固定返回成功，验证码为 1234
  return NextResponse.json({ success: true });
}
