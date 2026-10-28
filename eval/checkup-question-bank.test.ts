import test from "node:test";
import assert from "node:assert/strict";
import { QUESTION_BANK, getQuestionById } from "../src/lib/checkup/question-bank";
import { DIMENSIONS } from "../src/lib/checkup/dimensions";

test("question ids are unique", () => {
  assert.equal(new Set(QUESTION_BANK.map((q) => q.id)).size, QUESTION_BANK.length);
});

test("every dimension has at least 2 questions; family has at least 4", () => {
  for (const dimension of DIMENSIONS) {
    const count = QUESTION_BANK.filter((q) => q.dimension === dimension.id).length;
    assert.ok(count >= 2, `${dimension.id} has ${count}`);
  }
  assert.ok(QUESTION_BANK.filter((q) => q.dimension === "family").length >= 4);
});

// 计划 Task 3 的种子题库中，部分题目带「不清楚 / 不想说 / 没想过」类选项，
// 共 5 个选项；这些值被后续规则识别使用，故上限放宽为 5。
test("options are 2-5 and prompts are non-empty", () => {
  for (const q of QUESTION_BANK) {
    assert.ok(q.options.length >= 2 && q.options.length <= 5, q.id);
    assert.ok(q.prompt.trim().length > 0, q.id);
  }
});

test("family questions are required", () => {
  for (const q of QUESTION_BANK.filter((q) => q.dimension === "family")) {
    assert.equal(q.required, true);
  }
});

test("no forbidden product or guarantee words", () => {
  const text = QUESTION_BANK.map((q) => `${q.prompt} ${q.options.map((o) => o.label).join(" ")}`).join(" ");
  for (const word of ["友邦", "国寿", "复星", "万欣和", "稳赚", "保本", "保证领取"]) {
    assert.ok(!text.includes(word), word);
  }
});

test("getQuestionById finds a question", () => {
  assert.equal(getQuestionById("family_members")?.dimension, "family");
  assert.equal(getQuestionById("missing"), undefined);
});
