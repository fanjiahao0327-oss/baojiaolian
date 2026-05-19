/**
 * 微信 API 工具
 * - access_token 管理（内存缓存，多实例部署需迁移到 Redis）
 * - 手机号 code 换取
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
    return cachedToken.token;
  }

  const appid = process.env.WECHAT_APPID || "wx4d18f340c11adbf5";
  const secret = process.env.WECHAT_SECRET;
  if (!secret) throw new Error("WECHAT_SECRET 未配置");

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  );
  const data = await res.json();

  if (data.errcode) {
    console.error("[wechat] getAccessToken 失败:", JSON.stringify(data));
    throw new Error(`获取 access_token 失败: ${data.errmsg} (errcode=${data.errcode})`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/** 用 code 换取手机号（基础库 2.21.2+ 新方式） */
export async function getPhoneByCode(code: string): Promise<string | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }
    );
    const data = await res.json();

    if (data.errcode !== 0) {
      console.error("[wechat] getPhoneByCode 失败:", JSON.stringify(data));
      return null;
    }

    return data.phone_info?.purePhoneNumber || data.phone_info?.phoneNumber || null;
  } catch (e) {
    console.error("[wechat] getPhoneByCode 异常:", e);
    return null;
  }
}

export { getAccessToken };
