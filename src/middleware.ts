import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

// API 请求体大小限制：100KB
const MAX_BODY_SIZE = 100 * 1024;

// CSP 策略
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 请求体大小限制：仅对 API 路由检查
  if (pathname.startsWith("/api/")) {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > MAX_BODY_SIZE) {
        return NextResponse.json(
          { error: "请求体过大" },
          { status: 413 }
        );
      }
    }
  }

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", CSP_HEADER);
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return res;
  }

  const unsafeResponse = NextResponse.next();
  const session = await getIronSession<SessionData>(request, unsafeResponse, sessionOptions);

  if (!session.userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  unsafeResponse.headers.set("Content-Security-Policy", CSP_HEADER);
  unsafeResponse.headers.set("X-Content-Type-Options", "nosniff");
  unsafeResponse.headers.set("X-Frame-Options", "DENY");
  unsafeResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return unsafeResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
