import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, verifySessionToken } from "../src/lib/checkup/session";

// 测试环境不加载 .env.local，显式注入满足长度要求的密钥。
process.env.SESSION_SECRET = "checkup-session-test-secret-0123456789abcdef";

test("signs and verifies", () => {
  const token = createSessionToken("s-1", 1000);
  const payload = verifySessionToken(token, 2000);
  assert.equal(payload?.sessionId, "s-1");
  assert.equal(payload?.iat, 1000);
  assert.equal(payload?.exp, 1000 + 2 * 60 * 60 * 1000);
});

test("rejects tampered token", () => {
  const token = createSessionToken("s-1", 1000);
  assert.equal(verifySessionToken(token.slice(0, -2) + "xx", 2000), null);
});

test("rejects expired token", () => {
  const token = createSessionToken("s-1", 1000);
  assert.equal(verifySessionToken(token, 1000 + 3 * 60 * 60 * 1000), null);
});
