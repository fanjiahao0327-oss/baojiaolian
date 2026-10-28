import test from "node:test";
import assert from "node:assert/strict";
import { deriveProfileFromText, emptyProfile } from "../src/lib/checkup/profile";
import {
  buildModulePlan,
  buildModuleSummary,
  nextModuleQuestion,
  selectModuleIds,
} from "../src/lib/checkup/modules";
import { applyAnswer } from "../src/lib/checkup/follow-up";
import type { Answer } from "../src/lib/checkup/types";

test("医疗+养老开场会先出医疗、养老模块，再补家庭和财务", () => {
  const profile = deriveProfileFromText("我 38 岁，普通职工，孩子上小学，只有社保，担心医疗和养老。");
  const ids = selectModuleIds(profile);
  assert.ok(ids.includes("medical"));
  assert.ok(ids.includes("retirement"));
  assert.ok(ids.includes("education"));
  assert.ok(!ids.includes("business"));
  assert.deepEqual(ids.slice(-2), ["family", "financial"]);
  const plan = buildModulePlan(profile);
  assert.equal(plan[0].id, "medical");
});

test("模块问题带来源、目的和模块标识", () => {
  const profile = deriveProfileFromText("我 60 岁，退休教师，担心养老，孩子已经结婚。");
  const result = nextModuleQuestion(profile, []);
  assert.ok(result);
  assert.ok(result!.question.source?.length);
  assert.ok(result!.question.purpose?.length);
  assert.equal(result!.question.module, result!.module.id);
  assert.ok(result!.moduleIndex >= 1);
  assert.ok(result!.moduleTotal >= 2);
});

test("企业主+已婚子女会出企业、传承、婚姻模块，教育不出现", () => {
  const profile = deriveProfileFromText("我 52 岁，自己开公司，儿子刚结婚，最怕企业债务和传承出问题。");
  const ids = selectModuleIds(profile);
  assert.ok(ids.includes("business"));
  assert.ok(ids.includes("inheritance"));
  assert.ok(!ids.includes("education"));
  const remarried = deriveProfileFromText("我再婚，前一段婚姻有个孩子，担心配偶债务。");
  assert.ok(selectModuleIds(remarried).includes("marriage"));
});

test("每个有答案的模块都能生成含隐性风险提示的小结", () => {
  const profile = deriveProfileFromText("我 38 岁，普通职工，担心医疗，只有社保。");
  const answers: Answer[] = [
    { questionId: "medical_priority", dimension: "protection", field: "medicalPriority", value: "cost", skipped: false },
    { questionId: "protection_medical", dimension: "protection", field: "medicalInsurance", value: "social_only", skipped: false },
  ];
  const summary = buildModuleSummary("medical", profile, answers);
  assert.ok(summary.includes("我联想到"));
  assert.ok(summary.includes("医疗"));
});

test("模块题不会重复问已回答的题", () => {
  const profile = emptyProfile();
  const first = nextModuleQuestion(profile, []);
  assert.ok(first);
  const answers = [
    { questionId: first!.question.id, dimension: first!.question.dimension, field: first!.question.field, value: first!.question.options[0].value, skipped: false },
  ];
  const second = nextModuleQuestion(profile, answers);
  assert.notEqual(second?.question.id, first!.question.id);
});
