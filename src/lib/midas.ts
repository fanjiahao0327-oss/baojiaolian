/**
 * 微信小程序虚拟支付 — Midas 米大师 API 客户端
 *
 * 接入文档：
 * https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *
 * 配置项（在微信 MP 后台 → 虚拟支付 → 基本配置 获取）：
 * - WECHAT_VIRTUAL_PAY_OFFER_ID: 米大师分配的 offer_id
 * - WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX: 沙箱环境 AppKey
 * - WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION: 现网环境 AppKey
 */

import crypto from "crypto";

const OFFER_ID = process.env.WECHAT_VIRTUAL_PAY_OFFER_ID || "";
const APPKEY_SANDBOX = process.env.WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX || "";
const APPKEY_PRODUCTION = process.env.WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION || "";

/** 获取当前环境的 AppKey */
function getAppKey(env: number): string {
  return env === 1 ? APPKEY_SANDBOX : APPKEY_PRODUCTION;
}

/** 当前使用沙箱还是正式环境（默认沙箱 1，正式上线前改为 0） */
const PAY_ENV = Number(process.env.WECHAT_VIRTUAL_PAY_ENV || "1");

/**
 * 生成 pay_sig 签名
 *
 * 签名算法：将 signData 字段按 key 字母序排序，
 * 拼接为 key1=val1&key2=val2&... 格式，末尾追加 &key=<appkey>，
 * 整体做 HMAC-SHA256 得到 pay_sig。
 */
export function generatePaySig(
  params: Record<string, string | number>,
  env: number = PAY_ENV
): string {
  const appkey = getAppKey(env);
  if (!appkey) {
    throw new Error(
      "虚拟支付 AppKey 未配置，请在 .env 中设置 WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX / WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION"
    );
  }

  const sortedKeys = Object.keys(params).sort();
  const signStr =
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&key=${appkey}`;

  return crypto.createHmac("sha256", appkey).update(signStr).digest("hex");
}

/**
 * 为小程序端 wx.requestVirtualPayment 准备支付参数
 */
export function prepareVirtualPaymentParams(params: {
  openid: string;
  outTradeNo: string;
  buyQuantity: number;
  productId?: string;
  zoneId?: string;
  env?: number;
}): {
  paySig: string;
  signData: Record<string, string | number>;
  offerId: string;
  env: number;
  outTradeNo: string;
} {
  if (!OFFER_ID) {
    throw new Error("WECHAT_VIRTUAL_PAY_OFFER_ID 未配置");
  }

  const env = params.env ?? PAY_ENV;

  const signData: Record<string, string | number> = {
    offer_id: OFFER_ID,
    openid: params.openid,
    out_trade_no: params.outTradeNo,
    buy_quantity: params.buyQuantity,
    currency_type: "CNY",
    env,
    ts: Math.floor(Date.now() / 1000),
  };

  if (params.productId) {
    signData.product_id = params.productId;
  }
  if (params.zoneId) {
    signData.zoneid = params.zoneId;
  }

  const paySig = generatePaySig(signData, env);

  return {
    paySig,
    signData,
    offerId: OFFER_ID,
    env,
    outTradeNo: params.outTradeNo,
  };
}

/** 检查虚拟支付是否已配置 */
export function isVirtualPayConfigured(): boolean {
  return !!(OFFER_ID && (APPKEY_SANDBOX || APPKEY_PRODUCTION));
}
