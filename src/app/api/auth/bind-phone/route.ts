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
    console.log("[bind-phone] step0: getSession start");
    const session = await getSession();
    console.log("[bind-phone] step0: userId=", session.userId);

    if (!session.userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    console.log("[bind-phone] step1: parse body");
    const body = await request.json();
    console.log("[bind-phone] step1: body keys=", Object.keys(body).join(","));

    let phone: string | null = null;

    if (body.code) {
      console.log("[bind-phone] step2: calling getPhoneByCode");
      phone = await getPhoneByCode(body.code);
      console.log("[bind-phone] step2: result=", phone ? "ok" : "null");
    }
    else if (body.encryptedData && body.iv) {
      console.log("[bind-phone] step2: decryptPhone (old API)");
      if (!session.sessionKey) {
        return NextResponse.json({ error: "请重新登录" }, { status: 400 });
      }
      phone = decryptPhone(body.encryptedData, body.iv, session.sessionKey);
    } else {
      console.log("[bind-phone] step2: no valid auth data");
      return NextResponse.json({ error: "缺少授权数据" }, { status: 400 });
    }

    if (!phone) {
      console.log("[bind-phone] step3: phone is null, return 400");
      return NextResponse.json({ error: "获取手机号失败，请重新授权" }, { status: 400 });
    }

    console.log("[bind-phone] step4: update DB, phone=", phone);
    const sql = getDb();
    await sql`UPDATE users SET phone = ${phone}, updated_at = NOW() WHERE id = ${session.userId}`;

    console.log("[bind-phone] step5: save session");
    session.phone = phone;
    await session.save();

    console.log("[bind-phone] step6: done");
    return NextResponse.json({ phone });
  } catch (e) {
    console.error("[bind-phone] catch:", (e as Error).message, (e as Error).stack);
    return NextResponse.json({ error: "绑定失败" }, { status: 500 });
  }
}
