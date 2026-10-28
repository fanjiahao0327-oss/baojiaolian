import test from "node:test";
import assert from "node:assert/strict";
import { calcAllIndices } from "../src/lib/checkup/indices";
import { buildIndexInputFromAnswers } from "../src/lib/checkup/index-input";
import { KNOWLEDGE_SNIPPETS } from "../src/lib/checkup/knowledge";
import { buildReportSections } from "../src/lib/checkup/report-sections";
import { buildRiskItems } from "../src/lib/checkup/risk-rules";
import type { Answer } from "../src/lib/checkup/types";

const answers: Answer[] = [
  { questionId: "family_members", dimension: "family", field: "household", value: "children", skipped: false },
  { questionId: "family_children", dimension: "family", field: "children", value: "married", skipped: false },
  { questionId: "family_parents", dimension: "family", field: "parents", value: "financial", skipped: false },
  { questionId: "family_siblings", dimension: "family", field: "siblings", value: "conflict", skipped: false },
  { questionId: "family_business", dimension: "family", field: "businessInvolvement", value: "self", skipped: false },
  { questionId: "protection_medical", dimension: "protection", field: "medicalInsurance", value: "social_only", skipped: false },
  { questionId: "protection_critical", dimension: "protection", field: "criticalIllness", value: "under30", skipped: false },
  { questionId: "protection_life", dimension: "protection", field: "lifeInsurance", value: "accident_only", skipped: false },
  { questionId: "protection_runway", dimension: "protection", field: "emergencyRunway", value: "3_6", skipped: false },
  { questionId: "protection_policy_roles", dimension: "protection", field: "policyRoles", value: "partial", skipped: false },
  { questionId: "inheritance_intent", dimension: "inheritance", field: "inheritanceIntent", value: "oral", skipped: false },
  { questionId: "inheritance_tools", dimension: "inheritance", field: "inheritanceTools", value: "none", skipped: false },
  { questionId: "inheritance_when", dimension: "inheritance", field: "inheritanceWhen", value: "not_thought", skipped: false },
  { questionId: "inheritance_control", dimension: "inheritance", field: "inheritanceControl", value: "not_thought", skipped: false },
  { questionId: "inheritance_worry", dimension: "inheritance", field: "inheritanceWorry", value: "split", skipped: false },
  { questionId: "cashflow_income_range", dimension: "cashflow", field: "annualIncomeRange", value: "60_100", skipped: false },
  { questionId: "cashflow_expense_range", dimension: "cashflow", field: "annualExpenseRange", value: "30_50", skipped: false },
  { questionId: "cashflow_income_stability", dimension: "cashflow", field: "incomeStability", value: "fluctuating", skipped: false },
  { questionId: "cashflow_passive", dimension: "cashflow", field: "passiveIncomeRange", value: "small", skipped: false },
  { questionId: "assets_liquid", dimension: "assets", field: "liquidAssetsRange", value: "50_100", skipped: false },
  { questionId: "assets_fixed", dimension: "assets", field: "fixedAssetsRange", value: "300_500", skipped: false },
  { questionId: "assets_debt", dimension: "assets", field: "totalDebtRange", value: "under100", skipped: false },
  { questionId: "assets_inheritance", dimension: "assets", field: "inheritanceAssetsRange", value: "none", skipped: false },
  { questionId: "business_ownership", dimension: "business", field: "businessOwnership", value: "self", skipped: false },
  { questionId: "business_guarantee", dimension: "business", field: "guarantees", value: "yes", skipped: false },
  { questionId: "business_debt", dimension: "business", field: "businessDebtRange", value: "100_300", skipped: false },
  { questionId: "business_succession", dimension: "business", field: "succession", value: "not_thought", skipped: false },
  { questionId: "marriage_status", dimension: "family", field: "maritalStatus", value: "first", skipped: false },
  { questionId: "marriage_assets", dimension: "marriage", field: "preMaritalAssets", value: "no", skipped: false },
  { questionId: "marriage_spouse_debt", dimension: "marriage", field: "spouseDebt", value: "yes", skipped: false },
  { questionId: "education_stage", dimension: "education", field: "childrenEducationStage", value: "primary", skipped: false },
  { questionId: "education_plan", dimension: "education", field: "studyAbroadPlan", value: "abroad", skipped: false },
  { questionId: "education_budget", dimension: "education", field: "educationBudgetRange", value: "under30", skipped: false },
  { questionId: "retirement_age", dimension: "retirement", field: "retirementAge", value: "55_60", skipped: false },
  { questionId: "retirement_income", dimension: "retirement", field: "retirementPlan", value: "social", skipped: false },
  { questionId: "retirement_cashflow", dimension: "retirement", field: "retirementCashflow", value: "10_20k", skipped: false },
  { questionId: "health_conditions", dimension: "health", field: "preExistingConditions", value: "controlled", skipped: false },
];

const input = buildIndexInputFromAnswers(answers);
const indices = calcAllIndices(input);
const risks = buildRiskItems(answers, indices);
const sections = buildReportSections({ answers, indices, risks, input });
const text = sections.map((section) => `${section.title}\n${section.paragraphs.join("\n")}`).join("\n\n");
const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;

const BANNED_WORDS = ["保本", "稳赚", "保证领取", "复星", "友邦", "国寿", "万欣和"];

test("完整报告生成 6–9 个章节，每章 2–5 段", () => {
  assert.ok(sections.length >= 6, `章节数应至少为 6，实际 ${sections.length}`);
  assert.ok(sections.length <= 9, `章节数应不超过 9，实际 ${sections.length}`);
  for (const section of sections) {
    assert.ok(section.title.length > 0);
    assert.ok(section.paragraphs.length >= 2, `${section.title} 少于 2 段`);
    assert.ok(section.paragraphs.length <= 5, `${section.title} 多于 5 段`);
    for (const paragraph of section.paragraphs) {
      assert.ok(paragraph.trim().length > 30, `${section.title} 存在过短的段落`);
    }
  }
});

test("报告总字数达到详细版要求", () => {
  assert.ok(chineseChars >= 2500, `中文字符数应不少于 2500，实际 ${chineseChars}`);
  assert.ok(chineseChars <= 4000, `中文字符数应不超过 4000，实际 ${chineseChars}`);
});

test("报告包含关键法律与传承内容", () => {
  assert.ok(text.includes("民法典"), "缺少民法典相关内容");
  assert.ok(text.includes("保险法"), "缺少保险法相关内容");
  assert.ok(text.includes("受益人"), "缺少受益人相关内容");
  assert.ok(text.includes("给谁"), "缺少传承确权三问");
  assert.ok(text.includes("代位继承"), "缺少代位继承说明");
  assert.ok(text.includes("夫妻共同财产"), "缺少婚姻财产说明");
  assert.ok(text.includes("家企隔离"), "缺少家企隔离说明");
  assert.ok(text.includes("保险金信托"), "缺少保险金信托说明");
  assert.ok(text.includes("家族信托"), "缺少家族信托说明");
  assert.ok(text.includes("90 天"), "缺少 90 天行动清单");
});

test("报告不包含禁用词或具体产品名", () => {
  for (const word of BANNED_WORDS) {
    assert.equal(text.includes(word), false, `报告出现禁用词：${word}`);
  }
});

test("每条风险都出现在报告中", () => {
  assert.ok(risks.length > 0, "样例应至少触发一条风险");
  for (const risk of risks) {
    assert.ok(text.includes(risk.title), `风险标题未覆盖：${risk.title}`);
  }
});

test("章节覆盖家庭、指数、风险、场景、传承、行动、诊断、预算", () => {
  const titles = sections.map((section) => section.title);
  for (const keyword of ["家庭结构", "五大指数", "风险", "分场景", "传承架构", "90 天", "一对一", "预算"]) {
    assert.ok(titles.some((title) => title.includes(keyword)), `缺少章节：${keyword}`);
  }
});

test("预算章节引用年收入和年支出，并明确非报价", () => {
  assert.ok(text.includes("80 万"), "应引用样例年收入 80 万");
  assert.ok(text.includes("40 万"), "应引用样例年支出 40 万");
  assert.ok(text.includes("不是保费报价"), "预算应说明不是保费报价");
});

test("信息不足时也能生成完整结构，并明确标注未提供", () => {
  const sparseAnswers: Answer[] = [
    { questionId: "family_members", dimension: "family", field: "household", value: "couple", skipped: false },
  ];
  const sparseInput = buildIndexInputFromAnswers(sparseAnswers);
  const sparseIndices = calcAllIndices(sparseInput);
  const sparseRisks = buildRiskItems(sparseAnswers, sparseIndices);
  const sparseSections = buildReportSections({
    answers: sparseAnswers,
    indices: sparseIndices,
    risks: sparseRisks,
    input: sparseInput,
  });
  const sparseText = sparseSections.map((section) => section.paragraphs.join("")).join("");
  assert.ok(sparseSections.length >= 6);
  assert.ok(sparseText.includes("本次未提供"));
  assert.ok(sparseText.includes("信息不足"));
});

test("只有一条风险时，风险章节仍保持 2–5 段", () => {
  const singleRiskSections = buildReportSections({ answers, indices, risks: [risks[0]], input });
  const riskSection = singleRiskSections.find((section) => section.title.includes("风险"));
  assert.ok(riskSection);
  assert.ok(riskSection.paragraphs.length >= 2);
  assert.ok(riskSection.paragraphs.length <= 5);
});

test("只有家企或婚姻一条线时，条件章节仍保持 2–5 段", () => {
  const businessOnly: Answer[] = [
    { questionId: "family_members", dimension: "family", field: "household", value: "children", skipped: false },
    { questionId: "family_business", dimension: "family", field: "businessInvolvement", value: "self", skipped: false },
    { questionId: "business_guarantee", dimension: "business", field: "guarantees", value: "yes", skipped: false },
  ];
  const marriageOnly: Answer[] = [
    { questionId: "family_members", dimension: "family", field: "household", value: "couple", skipped: false },
    { questionId: "marriage_assets", dimension: "marriage", field: "preMaritalAssets", value: "no", skipped: false },
    { questionId: "marriage_status", dimension: "family", field: "maritalStatus", value: "first", skipped: false },
  ];
  for (const sample of [businessOnly, marriageOnly]) {
    const sampleInput = buildIndexInputFromAnswers(sample);
    const sampleIndices = calcAllIndices(sampleInput);
    const sampleRisks = buildRiskItems(sample, sampleIndices);
    const sampleSections = buildReportSections({
      answers: sample,
      indices: sampleIndices,
      risks: sampleRisks,
      input: sampleInput,
    });
    const conditional = sampleSections.find((section) => section.title.includes("家企隔离"));
    assert.ok(conditional, "条件章节应存在");
    assert.ok(conditional.paragraphs.length >= 2);
    assert.ok(conditional.paragraphs.length <= 5);
  }
});

test("知识库片段覆盖指定主题且字段完整", () => {
  assert.ok(KNOWLEDGE_SNIPPETS.length >= 10);
  assert.ok(KNOWLEDGE_SNIPPETS.length <= 16);
  const ids = new Set(KNOWLEDGE_SNIPPETS.map((snippet) => snippet.id));
  for (const id of [
    "index-safety",
    "index-liquidity",
    "index-freedom",
    "index-independence",
    "index-inheritance",
    "civil-code-1127-1128",
    "insurance-law-39-42",
    "marriage-property-1062-1063",
    "marriage-debt-1064",
    "family-business-isolation",
    "tool-will",
    "tool-insurance-trust",
    "tool-family-trust",
    "risk-66",
    "suying-kyc",
    "inheritance-three-questions",
  ]) {
    assert.ok(ids.has(id), `缺少知识片段：${id}`);
  }
  for (const snippet of KNOWLEDGE_SNIPPETS) {
    assert.ok(snippet.title.length > 0);
    assert.ok(snippet.source.length > 0);
    assert.ok(snippet.body.length >= 40);
    assert.ok(snippet.keywords.length >= 3);
    for (const word of BANNED_WORDS) {
      assert.equal(snippet.body.includes(word), false, `${snippet.id} 出现禁用词：${word}`);
      assert.equal(snippet.title.includes(word), false, `${snippet.id} 标题出现禁用词：${word}`);
    }
  }
});
