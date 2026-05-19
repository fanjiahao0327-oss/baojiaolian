import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET;

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET!).update(payload).digest("base64url");
}

/** 签发 token：userId 编码 + 7 天有效期 */
export function createToken(userId: number): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** 验证 token，返回 userId 或 null */
export function verifyToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [userIdStr, expiresStr, sig] = parts;
    const payload = `${userIdStr}.${expiresStr}`;
    if (sign(payload) !== sig) return null;

    const expiresAt = Number(expiresStr);
    if (Date.now() > expiresAt) return null;

    return Number(userIdStr);
  } catch {
    return null;
  }
}
