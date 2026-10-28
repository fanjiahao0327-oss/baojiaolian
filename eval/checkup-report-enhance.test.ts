import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, enhanceReport } from "../src/lib/checkup/report";

const base = {
  answers: [
    { questionId: "family_members", dimension: "family" as const, field: "household", value: "children", skipped: false },
    { questionId: "protection_critical", dimension: "protection" as const, field: "criticalIllness", value: "none", skipped: false },
  ],
  triage: { primaryDomain: "inheritance" as const, secondaryDomain: null, confidence: 0.8, signals: [] },
  input: { annualIncome: 800000, annualExpense: 400000 },
};

test("AI can improve the summary but not the index scores", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => JSON.stringify({
    profile: { summary: "AI 改写后的摘要" },
    topRisks: draft.topRisks,
    actionPlan: draft.actionPlan,
    nextStep: draft.nextStep,
  }));
  assert.equal(enhanced.profile.summary, "AI 改写后的摘要");
  assert.deepEqual(enhanced.wealthIndices, draft.wealthIndices);
});

test("invalid AI output falls back to the draft", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => "not json");
  assert.equal(enhanced.profile.summary, draft.profile.summary);
});

test("AI that throws falls back to the draft", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => {
    throw new Error("upstream timeout");
  });
  assert.deepEqual(enhanced, draft);
});

test("AI cannot tamper with index scores, budget or disclaimer", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => JSON.stringify({
    profile: { summary: "AI 改写后的摘要" },
    wealthIndices: draft.wealthIndices.map((index) => ({ ...index, score: 0 })),
    budgetRange: { min: 1, max: 2, basis: "AI 改动", disclaimer: "AI 改动" },
    disclaimer: "AI 改掉的免责声明",
  }));
  assert.equal(enhanced.profile.summary, "AI 改写后的摘要");
  assert.deepEqual(enhanced.wealthIndices, draft.wealthIndices);
  assert.deepEqual(enhanced.budgetRange, draft.budgetRange);
  assert.equal(enhanced.disclaimer, draft.disclaimer);
});

test("AI output wrapped in a json code fence is still parsed", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => `\`\`\`json
${JSON.stringify({ profile: { summary: "围栏里的改写" } })}
\`\`\``);
  assert.equal(enhanced.profile.summary, "围栏里的改写");
  assert.deepEqual(enhanced.wealthIndices, draft.wealthIndices);
});
