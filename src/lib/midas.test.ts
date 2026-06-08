import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { isVirtualPaymentOrderPaid } from "./midas";

test("accepts paid and delivery-stage virtual payment orders", () => {
  for (const status of [2, 3, 4]) {
    assert.equal(
      isVirtualPaymentOrderPaid(
        {
          order_id: "PO-TEST-001",
          status,
          paid_fee: 690,
          order_type: 0,
        },
        "PO-TEST-001",
        690,
      ),
      true,
    );
  }
});

test("rejects unpaid, refunded, mismatched, or wrong-amount orders", () => {
  assert.equal(
    isVirtualPaymentOrderPaid(
      { order_id: "PO-TEST-001", status: 1, paid_fee: 690, order_type: 0 },
      "PO-TEST-001",
      690,
    ),
    false,
  );
  assert.equal(
    isVirtualPaymentOrderPaid(
      { order_id: "PO-TEST-001", status: 5, paid_fee: 690, order_type: 1 },
      "PO-TEST-001",
      690,
    ),
    false,
  );
  assert.equal(
    isVirtualPaymentOrderPaid(
      { order_id: "PO-OTHER", status: 2, paid_fee: 690, order_type: 0 },
      "PO-TEST-001",
      690,
    ),
    false,
  );
  assert.equal(
    isVirtualPaymentOrderPaid(
      { order_id: "PO-TEST-001", status: 2, paid_fee: 1, order_type: 0 },
      "PO-TEST-001",
      690,
    ),
    false,
  );
});

test("signs every Midas server API request, including delivery confirmation", () => {
  const source = fs.readFileSync(new URL("./midas.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /sign:\s*false/);
});

test("credits a verified order and its points in one atomic SQL statement", () => {
  const source = fs.readFileSync(
    new URL("../app/api/payment/verify/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /WITH updated AS/);
  assert.doesNotMatch(source, /await sql`BEGIN`/);
});
