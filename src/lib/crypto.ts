import crypto from "crypto";

const ALGO = "aes-256-gcm";
const MAGIC = "ENC:";
const IV_LEN = 16;
const TAG_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 必须至少 32 字符");
  }
  // 用 SHA-256 派生固定长度密钥
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 格式: ENC:<base64(iv + tag + ciphertext)>
  return MAGIC + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(MAGIC)) {
    // 旧明文数据，直接返回（透明迁移）
    return ciphertext;
  }
  const key = getKey();
  const raw = Buffer.from(ciphertext.slice(MAGIC.length), "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
