import crypto from "crypto";

export function timingSafeStringEqual(candidate: string | null | undefined, expected: string | null | undefined): boolean {
  if (!candidate || !expected) return false;

  const left = Buffer.from(candidate, "utf8");
  const right = Buffer.from(expected, "utf8");

  if (left.length !== right.length) {
    const maxLength = Math.max(left.length, right.length, 1);
    const paddedLeft = Buffer.alloc(maxLength);
    const paddedRight = Buffer.alloc(maxLength);
    left.copy(paddedLeft);
    right.copy(paddedRight);
    crypto.timingSafeEqual(paddedLeft, paddedRight);
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function isAdminKeyValid(candidate: string | null | undefined): boolean {
  return timingSafeStringEqual(candidate, process.env.ADMIN_KEY);
}
