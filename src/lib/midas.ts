/**
 * 微信小程序虚拟支付 — Midas 米大师 API 客户端
 *
 * 接入文档：
 * https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 *
 * 配置项（在微信 MP 后台 → 虚拟支付 → 基本配置 获取）：
 * - WECHAT_VIRTUAL_PAY_OFFER_ID: 米大师分配的 Offer ID
 * - WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX: 沙箱环境 AppKey
 * - WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION: 现网环境 AppKey
 */

import crypto from "crypto";

const OFFER_ID = process.env.WECHAT_VIRTUAL_PAY_OFFER_ID || "";
const APPKEY_SANDBOX = process.env.WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX || "";
const APPKEY_PRODUCTION = process.env.WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION || "";
const REQUEST_VIRTUAL_PAYMENT_URI = "requestVirtualPayment";
const GOODS_MODE = "short_series_goods";

/** 获取当前环境的 AppKey */
function getAppKey(env: number): string {
  return env === 1 ? APPKEY_SANDBOX : APPKEY_PRODUCTION;
}

/** 当前使用沙箱还是正式环境（默认沙箱 1，正式上线前改为 0） */
const PAY_ENV = Number(process.env.WECHAT_VIRTUAL_PAY_ENV || "1");

/**
 * 生成 pay_sig 签名
 *
 * 签名算法：to_hex(hmac_sha256(appKey, uri + "&" + signData))
 */
export function generatePaySig(
  signData: string,
  env: number = PAY_ENV,
  uri: string = REQUEST_VIRTUAL_PAYMENT_URI,
): string {
  const appkey = getAppKey(env);
  if (!appkey) {
    throw new Error(
      "虚拟支付 AppKey 未配置，请在 .env 中设置 WECHAT_VIRTUAL_PAY_APPKEY_SANDBOX / WECHAT_VIRTUAL_PAY_APPKEY_PRODUCTION"
    );
  }

  const signStr = uri + "&" + signData;

  return crypto.createHmac("sha256", appkey).update(signStr).digest("hex");
}

/** 生成 wx.requestVirtualPayment 所需的用户态签名 */
export function generateUserSignature(signData: string, sessionKey: string): string {
  if (!sessionKey) {
    throw new Error("缺少微信 session_key，请重新登录微信后再购买");
  }

  return crypto.createHmac("sha256", sessionKey).update(signData).digest("hex");
}

/**
 * 为小程序端 wx.requestVirtualPayment 准备支付参数
 */
export function prepareVirtualPaymentParams(params: {
  sessionKey: string;
  outTradeNo: string;
  buyQuantity: number;
  productId: string;
  goodsPrice: number;
  attach?: string;
  zoneId?: string;
  env?: number;
}): {
  paySig: string;
  signature: string;
  signData: string;
  mode: typeof GOODS_MODE;
  outTradeNo: string;
} {
  if (!OFFER_ID) {
    throw new Error("WECHAT_VIRTUAL_PAY_OFFER_ID 未配置");
  }

  const env = params.env ?? PAY_ENV;

  const signDataPayload: Record<string, string | number> = {
    offerId: OFFER_ID,
    buyQuantity: params.buyQuantity,
    env,
    currencyType: "CNY",
    productId: params.productId,
    goodsPrice: params.goodsPrice,
    outTradeNo: params.outTradeNo,
    attach: params.attach ?? params.outTradeNo,
  };

  if (params.zoneId) {
    signDataPayload.zoneId = params.zoneId;
  }

  const signData = JSON.stringify(signDataPayload);
  const paySig = generatePaySig(signData, env);
  const signature = generateUserSignature(signData, params.sessionKey);

  return {
    paySig,
    signature,
    signData,
    mode: "short_series_goods",
    outTradeNo: params.outTradeNo,
  };
}

/** 检查虚拟支付是否已配置 */
export function isVirtualPayConfigured(): boolean {
  return !!(OFFER_ID && getAppKey(PAY_ENV));
}
