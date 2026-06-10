import assert from "node:assert/strict";
import test from "node:test";

test("client stage labels cover the ten relationship stages", async () => {
  const alpha = await import("../src/lib/assistant-alpha").catch(
    () => ({} as Record<string, unknown>),
  );

  assert.equal(typeof alpha.getClientStageLabel, "function");
  const getClientStageLabel = alpha.getClientStageLabel as (stage: number) => string;

  assert.equal(getClientStageLabel(1), "待激活关系");
  assert.equal(getClientStageLabel(4), "需求探索");
  assert.equal(getClientStageLabel(9), "已成交并持续服务");
  assert.equal(getClientStageLabel(10), "暂缓或停止推进");
  assert.equal(getClientStageLabel(999), "未知阶段");
});

test("memory status transitions require user confirmation before long-term use", async () => {
  const alpha = await import("../src/lib/assistant-alpha").catch(
    () => ({} as Record<string, unknown>),
  );

  assert.equal(typeof alpha.canUseMemoryInLongTermContext, "function");
  const canUseMemoryInLongTermContext = alpha.canUseMemoryInLongTermContext as (
    status: string,
  ) => boolean;

  assert.equal(canUseMemoryInLongTermContext("proposed"), false);
  assert.equal(canUseMemoryInLongTermContext("confirmed"), true);
  assert.equal(canUseMemoryInLongTermContext("rejected"), false);
});

test("today task builder separates must-do and suggested actions", async () => {
  const { buildTodaySections } = await import("../src/lib/assistant-alpha");

  const result = buildTodaySections([
    {
      id: 1,
      title: "给张先生发送资料",
      taskType: "explicit_followup",
      priority: "must",
      status: "open",
      dueAt: "2026-06-10T09:00:00.000Z",
      clientName: "张先生",
    },
    {
      id: 2,
      title: "建议联系李姐",
      taskType: "ai_suggested_followup",
      priority: "suggested",
      status: "open",
      dueAt: null,
      clientName: "李姐",
    },
  ]);

  assert.equal(result.mustDo.length, 1);
  assert.equal(result.suggested.length, 1);
  assert.equal(result.mustDo[0].title, "给张先生发送资料");
  assert.equal(result.suggested[0].title, "建议联系李姐");
});

test("rating normalization accepts only 1 to 5 scores and known reason tags", async () => {
  const { normalizeRatingInput } = await import("../src/lib/assistant-alpha");

  assert.deepEqual(
    normalizeRatingInput({
      taskType: "client_quick_help",
      score: 5,
      reasonTags: ["natural", "actionable", "personalized", "invalid_tag"],
      comment: "这次建议能直接用",
    }),
    {
      taskType: "client_quick_help",
      score: 5,
      reasonTags: ["natural", "actionable", "personalized"],
      comment: "这次建议能直接用",
    },
  );

  assert.throws(
    () => normalizeRatingInput({ taskType: "client_quick_help", score: 6 }),
    /评分必须是 1 到 5/,
  );
});
