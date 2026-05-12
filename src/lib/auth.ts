import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: number;
  phone?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "a-very-long-secret-key-at-least-32-chars!!",
  cookieName: "baojiaolian-session",
  cookieOptions: {
    // 仅在真正部署 HTTPS 时开启 Secure
    secure: process.env.NODE_ENV === "production" && !!process.env.FORCE_SECURE_COOKIE,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
