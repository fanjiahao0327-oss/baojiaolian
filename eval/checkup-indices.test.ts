import test from "node:test";
import assert from "node:assert/strict";
import { calcAllIndices, calcSafety, calcLiquidity, calcFreedom, calcIndependence, calcInheritance } from "../src/lib/checkup/indices";

test("safety index averages available components", () => {
  const result = calcSafety({
    annualIncome: 600000, annualExpense: 300000,
    liquidAssets: 300000, totalAssets: 1000000, totalDebt: 200000,
    medicalCoverage: 1000000, criticalCoverage: 3000000, lifeCoverage: 6000000,
  });
  assert.equal(result.dataStatus, "enough");
  assert.ok(typeof result.score === "number");
});

test("safety index is insufficient without income", () => {
  const result = calcSafety({ annualExpense: 300000 });
  assert.equal(result.dataStatus, "insufficient");
  assert.equal(result.score, null);
});

test("liquidity index", () => {
  assert.equal(calcLiquidity({ liquidAssets: 200000, totalAssets: 1000000 }).score, 20);
  assert.equal(calcLiquidity({ liquidAssets: null }).score, null);
});

test("freedom index caps at 100", () => {
  assert.equal(calcFreedom({ passiveIncome: 500000, annualExpense: 300000 }).score, 100);
  assert.equal(calcFreedom({ passiveIncome: 150000, annualExpense: 300000 }).score, 50);
});

test("independence index", () => {
  assert.equal(calcIndependence({ totalAssets: 1000000, lifeDebt: 2000000 }).score, 50);
  assert.equal(calcIndependence({ totalAssets: 3000000, lifeDebt: 2000000 }).score, 100);
});

test("inheritance index", () => {
  assert.equal(calcInheritance({ inheritanceAssets: 300000, totalAssets: 1000000 }).score, 30);
});

test("all indices keeps unknown when data missing", () => {
  const all = calcAllIndices({ annualExpense: 300000 });
  assert.equal(all.length, 5);
  assert.ok(all.some((item) => item.level === "unknown"));
});
