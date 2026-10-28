import test from "node:test";
import assert from "node:assert/strict";
import { applyAnswer, selectNextQuestion, MAX_ROUNDS } from "../src/lib/checkup/follow-up";
import type { FollowUpState } from "../src/lib/checkup/follow-up";
import { buildIndexInputFromAnswers } from "../src/lib/checkup/index-input";
import { calcAllIndices } from "../src/lib/checkup/indices";
import { buildRiskItems } from "../src/lib/checkup/risk-rules";
import type { Question, TriageResult } from "../src/lib/checkup/types";

const triage: TriageResult = { primaryDomain: "inheritance", secondaryDomain: null, confidence: 0.8, signals: [] };

const PREFERRED: Record<string, string> = {
  family_members: "children",
  family_children: "married",
  family_parents: "healthy",
  family_siblings: "only_child",
  family_business: "none",
  marriage_status: "first",
  protection_medical: "million",
  protection_critical: "30_50",
  protection_life: "both",
  protection_runway: "over12",
  protection_policy_roles: "clear",
  inheritance_intent: "thought",
  cashflow_income_range: "60_100",
  cashflow_expense_range: "10_30",
  cashflow_passive: "partial",
  assets_liquid: "50_100",
  assets_fixed: "500_1000",
  assets_debt: "under100",
  assets_inheritance: "200_500",
  inheritance_children_marriage: "before",
  inheritance_tools: "none",
  inheritance_when: "age35",
  inheritance_control: "conditions",
  education_stage: "primary",
  education_plan: "abroad",
  retirement_age: "55_60",
  retirement_income: "social",
};

function valueFor(question: Question): string {
  return PREFERRED[question.id] ?? question.options[0].value;
}

test("a willing customer reaches all five wealth indices without 信息不足", () => {
  let state: FollowUpState = { answers: [], triage, customerWantsReport: false };
  let rounds = 0;
  while (rounds < MAX_ROUNDS) {
    const question = selectNextQuestion(state);
    if (!question) break;
    state = applyAnswer(state, question, { value: valueFor(question), skipped: false });
    rounds += 1;
  }

  assert.ok(state.answers.length >= 18, `answered ${state.answers.length}`);
  const input = buildIndexInputFromAnswers(state.answers);
  const indices = calcAllIndices(input);
  for (const index of indices) {
    assert.notEqual(index.score, null, `${index.name} should have a score`);
  }
  const risks = buildRiskItems(state.answers, indices);
  assert.ok(risks.length >= 1);
  for (const risk of risks) {
    assert.ok(risk.ifIgnored.length > 0);
    assert.ok(risk.sourceRefs.length > 0);
  }
});
