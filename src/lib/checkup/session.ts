import crypto from "crypto";
import type { SessionPayload } from "./types";

const TTL_MS = 2 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET 必须至少 32 字符");
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(crypto.createHmac("sha256", getSecret()).update(payload).digest());
}

export function createSessionToken(sessionId: string, now = Date.now()): string {
  const payload: SessionPayload = { sessionId, iat: now, exp: now + TTL_MS };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string, now = Date.now()): SessionPayload | null {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = sign(body);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as SessionPayload;
    if (!payload.sessionId || typeof payload.exp !== "number" || now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
