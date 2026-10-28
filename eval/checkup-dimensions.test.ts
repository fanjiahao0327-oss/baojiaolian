import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, getDimension } from "../src/lib/checkup/dimensions";

test("has 10 dimensions with unique ids", () => {
  assert.equal(DIMENSIONS.length, 10);
  assert.equal(new Set(DIMENSIONS.map((d) => d.id)).size, 10);
});

test("family and protection are must-ask", () => {
  assert.equal(getDimension("family").askPolicy, "must");
  assert.equal(getDimension("protection").askPolicy, "must");
});

test("inheritance is main-domain", () => {
  assert.equal(getDimension("inheritance").askPolicy, "main_domain");
});

test("cashflow/assets/health/education/retirement/business/marriage are mentioned-only", () => {
  for (const id of ["cashflow", "assets", "health", "education", "retirement", "business", "marriage"] as const) {
    assert.equal(getDimension(id).askPolicy, "mentioned_only");
  }
});
