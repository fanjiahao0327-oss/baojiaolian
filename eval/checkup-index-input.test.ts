import test from "node:test";
import assert from "node:assert/strict";
import { buildIndexInputFromAnswers } from "../src/lib/checkup/index-input";
import type { Answer } from "../src/lib/checkup/types";

function answer(questionId: string, value: string, skipped = false): Answer {
  return { questionId, dimension: "cashflow", field: questionId, value, skipped };
}

test("maps income/expense and protection coverage", () => {
  const input = buildIndexInputFromAnswers([
    answer("cashflow_income_range", "60_100"),
    answer("cashflow_expense_range", "10_30"),
    answer("protection_medical", "million"),
    answer("protection_critical", "30_50"),
    answer("protection_life", "both"),
  ]);
  assert.equal(input.annualIncome, 800000);
  assert.equal(input.annualExpense, 200000);
  assert.equal(input.medicalCoverage, 1000000);
  assert.equal(input.criticalCoverage, 400000);
  assert.equal(input.lifeCoverage, 1000000);
});

test("skipped answers stay undefined", () => {
  const input = buildIndexInputFromAnswers([
    answer("cashflow_income_range", "skip", true),
    answer("protection_medical", "social_only"),
  ]);
  assert.equal(input.annualIncome, null);
  assert.equal(input.medicalCoverage, 0);
});
