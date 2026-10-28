import test from "node:test";
import assert from "node:assert/strict";
import { buildOrderNo, isOrderExpired, canUnlock } from "../src/lib/checkup/store";

test("order number has CK prefix and date", () => {
  const orderNo = buildOrderNo(new Date("2026-10-28T00:00:00Z"));
  assert.match(orderNo, /^CK-20261028-[A-Z0-9]{8}$/);
});

test("expired order", () => {
  assert.equal(isOrderExpired({ expires_at: "2026-10-28T00:00:00Z" }, new Date("2026-10-28T01:00:00Z")), true);
  assert.equal(isOrderExpired({ expires_at: "2026-10-28T02:00:00Z" }, new Date("2026-10-28T01:00:00Z")), false);
});

test("can unlock only paid order for same session", () => {
  assert.equal(canUnlock({ status: "paid", session_id: "s1" }, "s1"), true);
  assert.equal(canUnlock({ status: "pending", session_id: "s1" }, "s1"), false);
  assert.equal(canUnlock({ status: "paid", session_id: "s2" }, "s1"), false);
});
