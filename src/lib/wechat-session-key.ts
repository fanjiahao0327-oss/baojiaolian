import crypto from "crypto";

const PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 必须至少 32 字符，请检查环境配置");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function sealWechatSessionKey(sessionKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(sessionKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function unsealWechatSessionKey(value: string): string | null {
  if (!value) return null;
  if (!value.startsWith(`${PREFIX}.`)) return value;

  try {
    const [, ivText, tagText, ciphertextText] = value.split(".");
    if (!ivText || !tagText || !ciphertextText) return null;

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}
