const SECRET = process.env.SESSION_SECRET;

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET!);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 签发 token：userId 编码 + 7 天有效期 */
export async function createToken(userId: number): Promise<string> {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

/** 验证 token，返回 userId 或 null */
export async function verifyToken(token: string): Promise<number | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [userIdStr, expiresStr, sig] = parts;
    const payload = `${userIdStr}.${expiresStr}`;
    if ((await sign(payload)) !== sig) return null;

    const expiresAt = Number(expiresStr);
    if (Date.now() > expiresAt) return null;

    return Number(userIdStr);
  } catch {
    return null;
  }
}
