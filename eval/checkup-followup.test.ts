import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ROUNDS,
  applyAnswer,
  progressLabel,
  selectNextQuestion,
  shouldStop,
} from "../src/lib/checkup/follow-up";
import type { FollowUpState } from "../src/lib/checkup/follow-up";
import { getQuestionById, getQuestionsForDimension } from "../src/lib/checkup/question-bank";
import type { Answer, CheckupDimensionId, Question, TriageResult } from "../src/lib/checkup/types";

const triage: TriageResult = { primaryDomain: "inheritance", secondaryDomain: null, confidence: 0.8, signals: [] };

const PREFERRED: Record<string, string> = {
  family_children: "married",
  family_business: "self",
  protection_medical: "million",
  protection_critical: "none",
  protection_life: "none",
  protection_runway: "under3",
  protection_policy_roles: "unknown",
  cashflow_income_range: "60_100",
  cashflow_expense_range: "10_30",
  cashflow_passive: "none",
  assets_liquid: "50_100",
  assets_fixed: "500_1000",
  assets_debt: "under100",
  assets_inheritance: "under50",
  inheritance_intent: "thought",
  business_guarantee: "yes",
};

function state(answers: Answer[] = [], overrides: Partial<FollowUpState> = {}): FollowUpState {
  return { answers, triage, customerWantsReport: false, ...overrides };
}

function pickValue(question: Question): string {
  return PREFERRED[question.id] ?? question.options[0].value;
}

function answerNext(current: FollowUpState): { state: FollowUpState; next: Question | null } {
  const next = selectNextQuestion(current);
  if (!next) return { state: current, next: null };
  return {
    state: applyAnswer(current, next, { value: pickValue(next), skipped: false }),
    next,
  };
}

function completeModule(start: FollowUpState, dimension: CheckupDimensionId): { state: FollowUpState; next: Question | null } {
  let current = start;
  let next = selectNextQuestion(current);
  while (next && next.dimension === dimension) {
    current = applyAnswer(current, next, { value: pickValue(next), skipped: false });
    next = selectNextQuestion(current);
  }
  return { state: current, next };
}

test("asks family first", () => {
  const next = selectNextQuestion(state());
  assert.equal(next?.dimension, "family");
});

test("asks the whole family module before protection", () => {
  const { state: afterFamily, next } = completeModule(state(), "family");
  assert.deepEqual(
    afterFamily.answers.map((answer) => answer.questionId),
    getQuestionsForDimension("family").map((question) => question.id),
  );
  assert.equal(next?.dimension, "protection");
});

test("asks the whole protection module, including policy roles", () => {
  const family = completeModule(state(), "family");
  const protection = completeModule(family.state, "protection");
  assert.ok(protection.state.answers.some((answer) => answer.questionId === "protection_policy_roles"));
  assert.notEqual(protection.next?.dimension, "protection");
});

test("asks a triggered follow-up after family and protection", () => {
  const family = completeModule(state(), "family");
  const protection = completeModule(family.state, "protection");
  const next = selectNextQuestion(protection.state);
  assert.equal(next?.id, "inheritance_children_marriage");
});

test("asks core financial questions before deep-diving the primary domain", () => {
  const family = completeModule(state(), "family");
  const protection = completeModule(family.state, "protection");

  // 先把所有由家庭/保障答案触发的追问问完（孩子已婚、企业担保、健康缺口等）
  let current = protection.state;
  let early = selectNextQuestion(current);
  let guard = 0;
  while (early && early.id !== "cashflow_income_range" && guard < 8) {
    current = applyAnswer(current, early, { value: pickValue(early), skipped: false });
    early = selectNextQuestion(current);
    guard += 1;
  }
  assert.equal(early?.id, "cashflow_income_range");
  const asked: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const step = answerNext(current);
    if (!step.next) break;
    asked.push(step.next.id);
    current = step.state;
  }
  assert.deepEqual(asked, [
    "cashflow_income_range",
    "cashflow_expense_range",
    "cashflow_passive",
    "assets_liquid",
    "assets_fixed",
    "assets_debt",
    "assets_inheritance",
  ]);
  assert.equal(selectNextQuestion(current)?.dimension, "inheritance");
});

test("does not re-ask a skipped question", () => {
  const first = selectNextQuestion(state())!;
  const skipped = applyAnswer(state(), first, { value: "skip", skipped: true });
  assert.equal(skipped.answers.length, 1);
  assert.notEqual(selectNextQuestion(skipped)?.id, first.id);
});

test("stops at MAX_ROUNDS", () => {
  const answers = Array.from({ length: MAX_ROUNDS }, (_, index) => ({
    questionId: `q${index}`,
    dimension: "family" as const,
    field: `f${index}`,
    value: "x",
    skipped: false,
  }));
  assert.equal(shouldStop(state(answers)), true);
});

test("customer can request report immediately", () => {
  assert.equal(shouldStop({ ...state(), customerWantsReport: true }), true);
});

test("does not stop before minimum rounds while questions remain", () => {
  const family = completeModule(state(), "family");
  assert.equal(shouldStop(family.state), false);
});

test("applyAnswer appends", () => {
  const question = selectNextQuestion(state())!;
  const next = applyAnswer(state(), question, { value: "couple", skipped: false });
  assert.equal(next.answers.length, 1);
  assert.equal(next.answers[0].questionId, question.id);
  assert.equal(next.answers[0].skipped, false);
});

test("progressLabel reports capped progress", () => {
  assert.equal(progressLabel(state()), `0/${MAX_ROUNDS}`);
  const answers = Array.from({ length: MAX_ROUNDS }, (_, index) => ({
    questionId: `q${index}`,
    dimension: "family" as const,
    field: `f${index}`,
    value: "x",
    skipped: false,
  }));
  assert.equal(progressLabel(state(answers)), `${MAX_ROUNDS}/${MAX_ROUNDS}`);
});

test("new deep-dive questions are reachable", () => {
  for (const id of ["assets_fixed", "assets_inheritance", "inheritance_when", "business_debt"]) {
    assert.ok(getQuestionById(id), id);
  }
});
