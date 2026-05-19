import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows, row } from "@/lib/db";
import { createToken } from "@/lib/token";

const WECHAT_APPID = process.env.WECHAT_APPID || "wx4d18f340c11adbf5";
const WECHAT_SECRET = process.env.WECHAT_SECRET;

export async function POST(request: NextRequest) {
  if (!WECHAT_SECRET) {
    console.error("[wechat-login] WECHAT_SECRET 未配置");
    return NextResponse.json({ error: "微信登录未配置" }, { status: 500 });
  }

  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: "缺少授权码" }, { status: 400 });
    }

    // 用 code 换取 openid
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    );
    const wxData = await wxRes.json();

    if (wxData.errcode) {
      console.error("[wechat-login] 微信 API 错误:", wxData);
      return NextResponse.json({ error: "微信登录失败" }, { status: 400 });
    }

    const openid = wxData.openid as string;
    const sessionKey = wxData.session_key as string;

    // 查找或创建用户
    const sql = getDb();
    const existing = await sql`SELECT id, phone FROM users WHERE wechat_openid = ${openid}`;
    let user: { id: number; phone: string | null } | null = null;

    if (rows(existing).length > 0) {
      user = row<{ id: number; phone: string | null }>(existing);
      await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;
    } else {
      const result = await sql`INSERT INTO users (wechat_openid, last_login_at) VALUES (${openid}, NOW()) RETURNING id, phone`;
      user = row<{ id: number; phone: string | null }>(result);
    }

    // 创建 session（保存 session_key 用于解密手机号）
    const session = await getSession();
    session.userId = user.id;
    if (user.phone) session.phone = user.phone;
    session.sessionKey = sessionKey;
    await session.save();

    return NextResponse.json({
      user: { userId: user.id, phone: user.phone },
      token: createToken(user.id),
    });
  } catch (e) {
    console.error("[wechat-login] 异常:", e);
    return NextResponse.json({ error: "登录失败，请重试" }, { status: 500 });
  }
}
