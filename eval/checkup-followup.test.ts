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
import { getQuestionsForDimension } from "../src/lib/checkup/question-bank";
import type { Answer, CheckupDimensionId, TriageResult } from "../src/lib/checkup/types";

const triage: TriageResult = { primaryDomain: "inheritance", secondaryDomain: null, confidence: 0.7, signals: [] };

// 计划 Task 7 的示例测试按「家庭结构 4 题」编写，但已实现的种子题库中家庭结构有 5 题
// （含 family_siblings），且任务要求家庭结构 5 题必先问，因此这里按题库补齐第 5 题。
const familyAnswers: Answer[] = [
  { questionId: "family_members", dimension: "family", field: "household", value: "children", skipped: false },
  { questionId: "family_children", dimension: "family", field: "children", value: "married", skipped: false },
  { questionId: "family_parents", dimension: "family", field: "parents", value: "healthy", skipped: false },
  { questionId: "family_siblings", dimension: "family", field: "siblings", value: "harmony", skipped: false },
  { questionId: "family_business", dimension: "family", field: "businessInvolvement", value: "none", skipped: false },
];

const protectionAnswers: Answer[] = [
  { questionId: "protection_medical", dimension: "protection", field: "medicalInsurance", value: "million", skipped: false },
  { questionId: "protection_critical", dimension: "protection", field: "criticalIllness", value: "30_50", skipped: false },
  { questionId: "protection_life", dimension: "protection", field: "lifeInsurance", value: "both", skipped: false },
  { questionId: "protection_runway", dimension: "protection", field: "emergencyRunway", value: "over12", skipped: false },
];

function state(answers: Answer[] = [], overrides: Partial<FollowUpState> = {}): FollowUpState {
  return { answers, triage, customerWantsReport: false, ...overrides };
}

function fakeAnswer(questionId: string, dimension: CheckupDimensionId, field: string, value = "x"): Answer {
  return { questionId, dimension, field, value, skipped: false };
}

function allAnswersFor(dimension: CheckupDimensionId): Answer[] {
  return getQuestionsForDimension(dimension).map((question) =>
    fakeAnswer(question.id, question.dimension, question.field),
  );
}

test("asks family first", () => {
  const next = selectNextQuestion(state());
  assert.equal(next?.dimension, "family");
});

test("asks the whole family module before protection", () => {
  const seen: string[] = [];
  let current = state();
  let next = selectNextQuestion(current);
  while (next && next.dimension === "family") {
    seen.push(next.id);
    current = applyAnswer(current, next, { value: next.options[0].value, skipped: false });
    next = selectNextQuestion(current);
  }
  assert.deepEqual(seen, getQuestionsForDimension("family").map((question) => question.id));
  assert.equal(next?.dimension, "protection");
});

test("asks protection after family", () => {
  const next = selectNextQuestion(state(familyAnswers));
  assert.equal(next?.dimension, "protection");
});

test("does not ask mentioned-only dimensions unless mentioned", () => {
  const next = selectNextQuestion(state([...familyAnswers, ...protectionAnswers]));
  // 必问模块问完后进入主域深挖（传承），不会主动去问收支/资产/健康等 mentioned-only 维度。
  assert.equal(next?.dimension, "inheritance");
  for (const dimension of ["cashflow", "assets", "health", "education", "retirement", "business", "marriage"] as const) {
    assert.notEqual(next?.dimension, dimension);
  }
});

test("deep dives primary domain before secondary domain", () => {
  const deepTriage: TriageResult = {
    primaryDomain: "retirement",
    secondaryDomain: "education",
    confidence: 0.8,
    signals: ["养老", "教育"],
  };
  const base = state([...familyAnswers, ...protectionAnswers], { triage: deepTriage });
  assert.equal(selectNextQuestion(base)?.dimension, "retirement");

  const retirementAnswers = allAnswersFor("retirement");
  const afterPrimary = { ...base, answers: [...base.answers, ...retirementAnswers] };
  assert.equal(selectNextQuestion(afterPrimary)?.dimension, "education");
});

test("asks a mentioned-only dimension only when the customer mentioned it", () => {
  const medicalTriage: TriageResult = { primaryDomain: "medical", secondaryDomain: null, confidence: 0.5, signals: [] };
  const base = state([...familyAnswers, ...protectionAnswers], { triage: medicalTriage });
  // medical 主域落到 protection 维度，必问时已问完；没人提到健康/教育，就不追问。
  assert.equal(selectNextQuestion(base), null);

  const mentioned = { ...base, mentionedDimensions: ["health" as const] };
  assert.equal(selectNextQuestion(mentioned)?.dimension, "health");
});

test("stops at 12 answers", () => {
  const answers = Array.from({ length: MAX_ROUNDS }, (_, index) => fakeAnswer(`q${index}`, "family", `f${index}`));
  assert.equal(shouldStop(state(answers)), true);
});

test("customer can request report", () => {
  assert.equal(shouldStop({ ...state(), customerWantsReport: true }), true);
});

test("does not stop before 12 rounds while questions remain", () => {
  assert.equal(shouldStop(state([...familyAnswers, ...protectionAnswers])), false);
});

test("stops after minimum rounds once no question remains", () => {
  const medicalTriage: TriageResult = { primaryDomain: "medical", secondaryDomain: null, confidence: 0.5, signals: [] };
  assert.equal(shouldStop(state([...familyAnswers, ...protectionAnswers], { triage: medicalTriage })), true);
});

test("applyAnswer appends", () => {
  const question = selectNextQuestion(state())!;
  const next = applyAnswer(state(), question, { value: "couple", skipped: false });
  assert.equal(next.answers.length, 1);
  assert.equal(next.answers[0].questionId, question.id);
  assert.equal(next.answers[0].dimension, "family");
  assert.equal(next.answers[0].skipped, false);
});

test("skipped answers count and are not re-asked", () => {
  const first = selectNextQuestion(state())!;
  const skipped = applyAnswer(state(), first, { value: "skip", skipped: true });
  assert.equal(skipped.answers.length, 1);
  assert.notEqual(selectNextQuestion(skipped)?.id, first.id);
});

test("progressLabel reports capped progress", () => {
  assert.equal(progressLabel(state()), `0/${MAX_ROUNDS}`);
  const answers = Array.from({ length: MAX_ROUNDS }, (_, index) => fakeAnswer(`q${index}`, "family", `f${index}`));
  assert.equal(progressLabel(state(answers)), `${MAX_ROUNDS}/${MAX_ROUNDS}`);
});
