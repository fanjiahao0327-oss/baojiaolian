import { NextRequest, NextResponse } from "next/server";
import { verifyNotifySign, decryptNotify } from "@/lib/wechatpay";
import { markCheckupOrderPaid } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const timestamp = request.headers.get("wechatpay-timestamp") || "";
  const nonce = request.headers.get("wechatpay-nonce") || "";
  const signature = request.headers.get("wechatpay-signature") || "";
  if (!verifyNotifySign(timestamp, nonce, raw, signature)) {
    return NextResponse.json({ code: "FAIL", message: "签名校验失败" }, { status: 401 });
  }
  const parsed = JSON.parse(raw) as { resource: { ciphertext: string; associated_data: string; nonce: string } };
  const resource = JSON.parse(decryptNotify(parsed.resource.ciphertext, parsed.resource.associated_data, parsed.resource.nonce)) as {
    out_trade_no: string;
    trade_state: string;
    transaction_id: string;
  };
  if (resource.trade_state === "SUCCESS") {
    await markCheckupOrderPaid(resource.out_trade_no, resource.transaction_id);
  }
  return NextResponse.json({ code: "SUCCESS", message: "成功" });
}
