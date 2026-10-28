import test from "node:test";
import assert from "node:assert/strict";
import { deriveProfileFromText } from "../src/lib/checkup/profile";
import { buildDirectionQuestion } from "../src/lib/checkup/opening";
import { buildModulePlan, buildModuleSummary, nextModuleQuestion } from "../src/lib/checkup/modules";
import type { Answer } from "../src/lib/checkup/types";

test("开场后只给 3–4 个方向，不直接进入题库", () => {
  const profile = deriveProfileFromText("我普通职工，孩子上小学，担心医疗和养老。");
  const question = buildDirectionQuestion(profile);
  assert.equal(question.id, "direction");
  assert.ok(question.options.length >= 3 && question.options.length <= 4);
  assert.ok(question.options.some((option) => option.value === "medical"));
  assert.ok(question.options.some((option) => option.value === "retirement"));
  assert.ok(question.source?.includes("一丁"));
});

test("客户选择先聊养老时，模块顺序会调到前面", () => {
  const profile = deriveProfileFromText("我担心医疗和养老。");
  profile.fields.__direction = "retirement";
  assert.equal(buildModulePlan(profile)[0].id, "retirement");
});

test("医疗模块的定性题是开放式，不给选项墙", () => {
  const profile = deriveProfileFromText("我担心医疗和养老。");
  const first = nextModuleQuestion(profile, []);
  assert.ok(first);
  assert.equal(first!.question.openOnly, true);
  assert.equal(first!.question.options.length > 0, true); // 数据里保留选项，但 UI 不展示
});

test("开放式回答会进入模块小结", () => {
  const profile = deriveProfileFromText("我担心医疗，只有社保。");
  const answers: Answer[] = [
    {
      questionId: "medical_priority",
      dimension: "protection",
      field: "medicalPriority",
      value: "free_text",
      freeText: "我最怕治疗费，也怕找不到好医生",
      skipped: false,
    },
  ];
  const summary = buildModuleSummary("medical", profile, answers);
  assert.ok(summary.includes("我最怕治疗费"));
});
