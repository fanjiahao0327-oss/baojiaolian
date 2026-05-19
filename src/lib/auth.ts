import { getIronSession, SessionOptions } from "iron-session";
import { cookies, headers } from "next/headers";
import { verifyToken } from "@/lib/token";

export interface SessionData {
  userId?: number;
  phone?: string;
  sessionKey?: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET 必须至少 32 字符，请检查 .env.local 配置");
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: "baojiaolian-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // 小程序 token 认证回退：Cookie session 不存在时，从 Authorization header 恢复
  if (!session.userId) {
    try {
      const headersList = await headers();
      const authHeader = headersList.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const userId = verifyToken(token);
        if (userId) {
          session.userId = userId;
        }
      }
    } catch {
      // headers() 在非 HTTP 上下文中可能不可用，静默跳过
    }
  }

  return session;
}
