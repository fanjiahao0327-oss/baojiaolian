import crypto from "crypto";
import fs from "fs";
import path from "path";

const WECHAT_MCHID = process.env.WECHAT_MCHID || "";
const WECHAT_CERT_SERIAL = process.env.WECHAT_CERT_SERIAL || "";
const WECHAT_APPID = process.env.WECHAT_APPID || "wx4d18f340c11adbf5";

function getPrivateKey(): string {
  if (process.env.WECHAT_KEY_PEM) {
    return Buffer.from(process.env.WECHAT_KEY_PEM, "base64").toString("utf-8");
  }
  const p = path.join(process.cwd(), "certs/apiclient_key.pem");
  return fs.readFileSync(p, "utf-8");
}

function getPublicKey(): string {
  if (process.env.WECHAT_PUBKEY_PEM) {
    return Buffer.from(process.env.WECHAT_PUBKEY_PEM, "base64").toString("utf-8");
  }
  const p = path.join(process.cwd(), "certs/pub_key.pem");
  return fs.readFileSync(p, "utf-8");
}

function sign(method: string, url: string, timestamp: number, nonce: string, body: string): string {
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
  const s = crypto.createSign("RSA-SHA256");
  s.update(signStr);
  return s.sign(getPrivateKey(), "base64");
}

function genNonce(): string {
  return crypto.randomBytes(16).toString("hex").slice(0, 32);
}

async function request(method: "GET" | "POST", urlPath: string, body?: object): Promise<unknown> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = genNonce();
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = sign(method, urlPath, timestamp, nonce, bodyStr);

  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_MCHID}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${WECHAT_CERT_SERIAL}"`;

  const resp = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth,
    },
    body: bodyStr || undefined,
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("[wechatpay] API error:", resp.status, JSON.stringify(data));
    throw new Error(`微信支付 API 错误: ${(data as { message?: string }).message || resp.status}`);
  }
  return data;
}

/** 创建 JSAPI 预支付订单 */
export async function createJSAPIPrepay(params: {
  openid: string;
  description: string;
  outTradeNo: string;
  amountCents: number;
}): Promise<{ prepay_id: string }> {
  const data = (await request("POST", "/v3/pay/transactions/jsapi", {
    appid: WECHAT_APPID,
    mchid: WECHAT_MCHID,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: "https://baojiaolian.com.cn/api/payment/notify",
    amount: {
      total: params.amountCents,
      currency: "CNY",
    },
    payer: {
      openid: params.openid,
    },
  })) as { prepay_id: string };

  return { prepay_id: data.prepay_id };
}

/** 生成小程序调起支付的参数 */
export function generatePayParams(prepayId: string): {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = genNonce();
  const pkgStr = `prepay_id=${prepayId}`;

  const signStr = `${WECHAT_APPID}\n${timestamp}\n${nonce}\n${pkgStr}\n`;
  const s = crypto.createSign("RSA-SHA256");
  s.update(signStr);
  const paySign = s.sign(getPrivateKey(), "base64");

  return {
    timeStamp: String(timestamp),
    nonceStr: nonce,
    package: pkgStr,
    signType: "RSA",
    paySign,
  };
}

/** 解密通知中的 resource 密文（微信回调字段均为 base64 编码） */
export function decryptNotify(ciphertext: string, associatedData: string, nonce: string): string {
  const key = process.env.WECHAT_PAY_KEY || "";
  const decoded = Buffer.from(ciphertext, "base64");
  const nonceBuf = Buffer.from(nonce, "base64");
  const aad = associatedData ? Buffer.from(associatedData, "base64") : Buffer.alloc(0);
  const authTag = decoded.subarray(-16);
  const data = decoded.subarray(0, -16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key), nonceBuf);
  decipher.setAuthTag(authTag);
  decipher.setAAD(aad);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf-8");
}

/** 按商户订单号查询微信支付订单状态 */
export async function queryOrderByOutTradeNo(
  outTradeNo: string
): Promise<{ tradeState: string; transactionId?: string } | null> {
  try {
    const data = (await request(
      "GET",
      `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${WECHAT_MCHID}`
    )) as {
      trade_state: string;
      transaction_id?: string;
      trade_state_desc?: string;
    };
    return { tradeState: data.trade_state, transactionId: data.transaction_id };
  } catch (e) {
    console.error("[wechatpay] queryOrder:", (e as Error).message);
    return null;
  }
}

/** 验证回调签名（用微信支付公钥验证） */
export function verifyNotifySign(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string
): boolean {
  const signStr = `${timestamp}\n${nonce}\n${body}\n`;
  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(signStr);
  return verify.verify(getPublicKey(), signature, "base64");
}
