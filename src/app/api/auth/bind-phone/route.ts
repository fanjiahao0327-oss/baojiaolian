import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPhoneByCode } from "@/lib/wechat";
import crypto from "crypto";

function decryptPhone(encryptedData: string, iv: string, sessionKey: string): string | null {
  try {
    const key = Buffer.from(sessionKey, "base64");
    const ivBuf = Buffer.from(iv, "base64");
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, ivBuf);
    decipher.setAutoPadding(true);
    let decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData, "base64")),
      decipher.final(),
    ]);
    const data = JSON.parse(decrypted.toString("utf-8"));
    return data.purePhoneNumber || data.phoneNumber || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();

    let phone: string | null = null;

    if (body.code) {
      phone = await getPhoneByCode(body.code);
    } else if (body.encryptedData && body.iv) {
      if (!session.sessionKey) {
        return NextResponse.json({ error: "请重新登录" }, { status: 400 });
      }
      phone = decryptPhone(body.encryptedData, body.iv, session.sessionKey);
    } else {
      return NextResponse.json({ error: "缺少授权数据" }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: "获取手机号失败，请重新授权" }, { status: 400 });
    }

    const sql = getDb();

    // 如果该手机号已被其他用户绑定，先清掉旧绑定
    await sql`UPDATE users SET phone = NULL WHERE phone = ${phone} AND id != ${session.userId}`;
    // 将手机号绑定到当前用户
    await sql`UPDATE users SET phone = ${phone}, updated_at = NOW() WHERE id = ${session.userId}`;

    session.phone = phone;
    await session.save();

    return NextResponse.json({ phone });
  } catch (e) {
    console.error("[bind-phone]", (e as Error).message);
    return NextResponse.json(
      { error: "绑定失败，请重试" },
      { status: 500 }
    );
  }
}
