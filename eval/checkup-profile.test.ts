import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntakeSummary,
  deriveProfileFromText,
  emptyProfile,
  mergeProfileAnswers,
  profileFromAnswers,
  requiredQuestionIds,
  selectProfileNextQuestion,
} from "../src/lib/checkup/profile";
import type { Answer } from "../src/lib/checkup/types";

function opening(text: string): Answer {
  return {
    questionId: "opening",
    dimension: "family",
    field: "openingText",
    value: "free_text",
    freeText: text,
    skipped: false,
  };
}

test("普通职工不会被追问企业问题", () => {
  const text = "我 38 岁，普通职工，两个孩子，一个上小学。只有社保，最近同事生病让我有点慌，也担心孩子教育花钱。";
  const profile = deriveProfileFromText(text);
  assert.equal(profile.occupation, "employee");
  assert.equal(profile.fields.family_business, "none");
  assert.equal(profile.fields.family_children, "school");
  assert.equal(profile.fields.protection_medical, "social_only");
  const answers = [opening(text)];
  const ids = requiredQuestionIds(profile, answers);
  assert.ok(!ids.includes("business_guarantee"));
  assert.ok(!ids.includes("business_succession"));
  assert.ok(!ids.includes("family_business"));
  assert.ok(ids.includes("education_plan"));

  const next = selectProfileNextQuestion(profile, answers);
  assert.notEqual(next?.dimension, "business");
});

test("企业主会被追问企业担保和接班", () => {
  const text = "我 52 岁，自己开公司，儿子刚结婚。我怕企业出问题把给孩子的钱搭进去。";
  const profile = deriveProfileFromText(text);
  assert.equal(profile.occupation, "business_owner");
  assert.equal(profile.fields.family_children, "married");
  const ids = requiredQuestionIds(profile, [opening(text)]);
  assert.ok(ids.includes("business_guarantee"));
  assert.ok(ids.includes("business_succession"));
  assert.ok(ids.includes("inheritance_tools"));
});

test("profile 已知字段合并进预览答案", () => {
  const profile = profileFromAnswers(emptyProfile(), [
    opening("我 45 岁，公司上班，孩子上小学"),
    { questionId: "family_children", dimension: "family", field: "children", value: "school", skipped: false },
  ]);
  const merged = mergeProfileAnswers(profile, []);
  assert.ok(merged.some((answer) => answer.questionId === "family_children" && answer.value === "school"));
  assert.ok(merged.some((answer) => answer.questionId === "opening"));
});

test("summary 包含家庭、保障和缺口", () => {
  const text = "我 38 岁，普通职工，只有社保，担心生病。";
  const profile = deriveProfileFromText(text);
  const summary = buildIntakeSummary(profile, [opening(text)]);
  assert.ok(summary.sections.length >= 1);
  assert.ok(summary.sections.some((section) => section.title === "已有保障"));
  assert.ok(summary.missing.length > 0);
});
