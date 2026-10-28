import test from "node:test";
import assert from "node:assert/strict";
import { buildPhrasePrompt, buildReportSystemPrompt, buildReportUserPrompt } from "../src/lib/checkup/prompts";
import { QUESTION_BANK } from "../src/lib/checkup/question-bank";

test("report system prompt has compliance and 5 indices", () => {
  const prompt = buildReportSystemPrompt();
  for (const word of ["安全指数", "流动指数", "自由指数", "独立指数", "传承指数", "不构成投保建议", "不得承诺收益", "不点名产品"]) {
    assert.ok(prompt.includes(word), word);
  }
});

test("phrase prompt includes question and no-answer permission", () => {
  const prompt = buildPhrasePrompt(QUESTION_BANK[0], "客户说孩子刚结婚");
  assert.ok(prompt.includes(QUESTION_BANK[0].prompt));
  assert.ok(prompt.includes("不想说"));
});

test("report user prompt includes structured data", () => {
  const prompt = buildReportUserPrompt({ profile: "x", indices: [], risks: [], answers: [] });
  assert.ok(prompt.includes("家庭财富平衡"));
});
