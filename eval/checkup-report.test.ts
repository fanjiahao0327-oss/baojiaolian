import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, toFreeReport, reportToText } from "../src/lib/checkup/report";

const base = {
  answers: [
    { questionId: "family_members", dimension: "family" as const, field: "household", value: "children", skipped: false },
    { questionId: "family_children", dimension: "family" as const, field: "children", value: "married", skipped: false },
    { questionId: "protection_critical", dimension: "protection" as const, field: "criticalIllness", value: "none", skipped: false },
    { questionId: "cashflow_income_range", dimension: "cashflow" as const, field: "annualIncomeRange", value: "60_100", skipped: false },
  ],
  triage: { primaryDomain: "inheritance" as const, secondaryDomain: null, confidence: 0.8, signals: [] },
  input: { annualIncome: 800000, annualExpense: 400000, liquidAssets: 200000, totalAssets: 2000000, totalDebt: 500000 },
};

test("builds full report with disclaimer", () => {
  const report = buildReport(base);
  assert.equal(report.disclaimer.includes("不构成保险产品推荐"), true);
  assert.equal(report.wealthIndices.length, 5);
  assert.ok(report.topRisks.length <= 5);
});

test("free report trims top risks and removes action plan", () => {
  const full = buildReport(base);
  const free = toFreeReport(full);
  assert.ok((free.topRisks.length ?? 0) <= 3);
  assert.equal(free.actionPlan.length, 0);
});

test("budget range is derived from annual expense", () => {
  const report = buildReport(base);
  assert.ok(report.budgetRange.min !== null && report.budgetRange.max !== null);
  assert.equal(report.budgetRange.disclaimer, "预算参考，非保费报价，非产品推荐");
});

test("reportToText is copyable", () => {
  const text = reportToText(buildReport(base));
  assert.ok(text.includes("AI家庭风险测评报告"));
  assert.ok(text.includes("安全指数"));
});

// 以下为在计划用例之外的补充断言，用于覆盖验收标准中的家庭画像、免费版预算与完整版行动清单。

test("profile covers family structure, children and siblings", () => {
  const report = buildReport({
    ...base,
    answers: [
      ...base.answers,
      { questionId: "family_siblings", dimension: "family" as const, field: "siblings", value: "conflict", skipped: false },
    ],
  });
  assert.ok(report.profile.familyStructure.includes("家庭结构"));
  assert.ok(report.profile.familyStructure.includes("夫妻与孩子"));
  assert.ok(report.profile.familyStructure.includes("孩子已结婚"));
  assert.ok(report.profile.familyStructure.includes("有兄弟姐妹，有分歧"));
});

test("profile marks missing family information as insufficient", () => {
  const report = buildReport(base);
  assert.ok(report.profile.familyStructure.includes("信息不足"));
});

test("budget range uses 10%-20% of annual surplus", () => {
  const report = buildReport(base);
  assert.equal(report.budgetRange.min, 40000);
  assert.equal(report.budgetRange.max, 80000);
  assert.ok(report.budgetRange.basis.includes("10%–20%"));
});

test("free report hides the budget and keeps the disclaimer", () => {
  const free = toFreeReport(buildReport(base));
  assert.equal(free.budgetRange.min, null);
  assert.equal(free.budgetRange.max, null);
  assert.ok(free.budgetRange.basis.length > 0);
  assert.equal(free.disclaimer.includes("不构成保险产品推荐"), true);
});

test("full report ships one next step, not a 90-day action list", () => {
  const report = buildReport(base);
  assert.equal(report.actionPlan.length, 0);
  assert.ok(report.nextStep.length > 0);
  assert.ok(report.detailSections?.some((section) => section.title.includes("下一步")));
});
