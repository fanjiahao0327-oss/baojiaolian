import test from "node:test";
import assert from "node:assert/strict";
import { buildRiskItems } from "../src/lib/checkup/risk-rules";
import type { Answer } from "../src/lib/checkup/types";

function answer(questionId: string, dimension: Answer["dimension"], value: string): Answer {
  return { questionId, dimension, field: questionId, value, skipped: false };
}

test("flags missing critical illness coverage", () => {
  const risks = buildRiskItems([
    answer("protection_critical", "protection", "none"),
    answer("protection_medical", "protection", "social_only"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("重疾") || r.title.includes("保障")));
});

test("flags inheritance risk for married children without tools", () => {
  const risks = buildRiskItems([
    answer("family_children", "family", "married"),
    answer("inheritance_tools", "inheritance", "none"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("传承")));
});

test("flags sibling inheritance flow risk", () => {
  const risks = buildRiskItems([
    answer("family_siblings", "family", "harmony"),
    answer("inheritance_tools", "inheritance", "none"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("兄弟姐妹")));
});

test("flags business guarantee risk", () => {
  const risks = buildRiskItems([
    answer("business_ownership", "business", "self"),
    answer("business_guarantee", "business", "yes"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("家企") || r.title.includes("债务")));
});

test("top risks are capped at five and sorted by severity", () => {
  const risks = buildRiskItems([
    answer("protection_critical", "protection", "none"),
    answer("protection_medical", "protection", "social_only"),
    answer("family_children", "family", "married"),
    answer("inheritance_tools", "inheritance", "none"),
    answer("business_ownership", "business", "self"),
    answer("business_guarantee", "business", "yes"),
    answer("marriage_status", "marriage", "remarried"),
  ], []);
  assert.ok(risks.length <= 5);
  assert.equal(risks[0].severity, "high");
});

test("every risk has a consequence and source", () => {
  const risks = buildRiskItems([answer("protection_critical", "protection", "none")], []);
  for (const risk of risks) {
    assert.ok(risk.ifIgnored.length > 0);
    assert.ok(risk.sourceRefs.length > 0);
  }
});

// 以下为在计划用例之外的补充断言，用于覆盖验收标准中的婚姻/指数/民法典/合规项。

test("flags marriage property risk for remarried or undocumented assets", () => {
  const risks = buildRiskItems([answer("marriage_status", "marriage", "remarried")], []);
  assert.ok(risks.some((r) => r.title.includes("婚姻")));
});

test("flags safety risk when the safety index is red", () => {
  const risks = buildRiskItems([], [{ name: "安全指数", level: "red" }]);
  assert.ok(risks.some((r) => r.title.includes("安全指数")));
});

test("flags inheritance index risk for married children when the inheritance index is red", () => {
  const risks = buildRiskItems([
    answer("family_children", "family", "married"),
    answer("inheritance_tools", "inheritance", "none"),
  ], [{ name: "传承指数", level: "red" }]);
  assert.ok(risks.some((r) => r.title.includes("传承指数")));
});

test("sibling inheritance rule cites civil code 1127/1128", () => {
  const risks = buildRiskItems([
    answer("family_siblings", "family", "conflict"),
    answer("inheritance_tools", "inheritance", "none"),
  ], []);
  const siblingRisk = risks.find((r) => r.title.includes("兄弟姐妹"));
  assert.ok(siblingRisk);
  assert.ok(siblingRisk.sourceRefs.some((ref) => ref.includes("民法典 1127/1128")));
});

test("risk copy avoids product names, company names and promise words", () => {
  const risks = buildRiskItems([
    answer("protection_critical", "protection", "none"),
    answer("protection_medical", "protection", "social_only"),
    answer("family_children", "family", "married"),
    answer("family_siblings", "family", "conflict"),
    answer("inheritance_tools", "inheritance", "none"),
    answer("business_ownership", "business", "self"),
    answer("business_guarantee", "business", "yes"),
    answer("marriage_status", "marriage", "remarried"),
  ], [
    { name: "安全指数", level: "red" },
    { name: "传承指数", level: "red" },
  ]);
  const text = risks
    .flatMap((risk) => [risk.title, risk.phenomenon, risk.whyItMatters, risk.ifIgnored, risk.suggestedAction])
    .join("\n");
  for (const word of [
    "平安", "国寿", "中国人寿", "友邦", "泰康", "新华保险", "人保", "太平洋保险",
    "保本", "稳赚", "保证收益", "承诺收益", "保证理赔", "必赔",
  ]) {
    assert.ok(!text.includes(word), word);
  }
});
