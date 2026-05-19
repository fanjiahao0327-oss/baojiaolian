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
  // 用这个变量追踪进度，出错时返回给前端方便调试
  let step = "0-start";
  try {
    step = "0-getSession";
    console.log("[bind-phone] step0: getSession start");
    const session = await getSession();
    console.log("[bind-phone] step0: userId=", session.userId);

    if (!session.userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    step = "1-parseBody";
    console.log("[bind-phone] step1: parse body");
    const body = await request.json();
    console.log("[bind-phone] step1: body keys=", Object.keys(body).join(","));

    let phone: string | null = null;

    if (body.code) {
      step = "2-getPhoneByCode";
      console.log("[bind-phone] step2: calling getPhoneByCode");
      phone = await getPhoneByCode(body.code);
      console.log("[bind-phone] step2: result=", phone ? "ok" : "null");
    } else if (body.encryptedData && body.iv) {
      step = "2-decryptPhone";
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

    step = "3-updateDB";
    console.log("[bind-phone] step3: update DB, phone=", phone);
    const sql = getDb();

    // 如果该手机号已被其他用户绑定，先清掉旧绑定
    await sql`UPDATE users SET phone = NULL WHERE phone = ${phone} AND id != ${session.userId}`;
    // 将手机号绑定到当前用户
    await sql`UPDATE users SET phone = ${phone}, updated_at = NOW() WHERE id = ${session.userId}`;
    console.log("[bind-phone] step3: DB updated");

    step = "4-saveSession";
    console.log("[bind-phone] step5: save session");
    session.phone = phone;
    await session.save();
    console.log("[bind-phone] step5: session saved");

    console.log("[bind-phone] step6: done");
    return NextResponse.json({ phone });
  } catch (e) {
    const errMsg = (e as Error).message || "unknown";
    const errStack = (e as Error).stack || "";
    console.error("[bind-phone] catch:", errMsg, errStack);
    // 临时返回详细错误信息，方便调试
    return NextResponse.json(
      { error: `绑定失败 [${step}]: ${errMsg}`, detail: errStack.split("\n").slice(0, 3).join(" | ") },
      { status: 500 }
    );
  }
}
