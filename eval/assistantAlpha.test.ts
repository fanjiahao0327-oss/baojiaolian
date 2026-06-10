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

test("assistant memory selection never leaks other clients into a client task", async () => {
  const { selectConfirmedMemoriesForAssistant } = await import("../src/lib/assistant-alpha");

  const result = selectConfirmedMemoriesForAssistant(
    [
      { scope: "agent", status: "confirmed", title: "表达偏好", content: "喜欢温和表达" },
      { scope: "client", clientId: 12, status: "confirmed", title: "张先生事实", content: "有两个孩子" },
      { scope: "client", clientId: 99, status: "confirmed", title: "李女士事实", content: "准备退休" },
      { scope: "client", clientId: 12, status: "proposed", title: "待确认", content: "可能担心养老" },
      { scope: "global", status: "confirmed", title: "计划偏好", content: "每周复盘一次" },
    ],
    12,
  );

  assert.deepEqual(
    result.map((memory) => memory.title),
    ["表达偏好", "张先生事实", "计划偏好"],
  );
});

test("assistant activation task builder creates confirmation tasks for first-use paths", async () => {
  const { buildAssistantActivationTask } = await import("../src/lib/assistant-alpha");

  assert.deepEqual(
    buildAssistantActivationTask("client_quick_help", 8),
    {
      clientId: 8,
      title: "确认并执行这位客户的下一步行动",
      taskType: "ai_suggested_followup",
      priority: "suggested",
    },
  );

  assert.deepEqual(
    buildAssistantActivationTask("agent_blueprint", null),
    {
      clientId: null,
      title: "确认个人经营蓝图里的第一步行动",
      taskType: "profile_setup",
      priority: "must",
    },
  );

  assert.equal(buildAssistantActivationTask("content_idea", null), null);
});

test("assistant client seed only creates lightweight clients for unbound path A", async () => {
  const { buildAssistantClientSeed } = await import("../src/lib/assistant-alpha");

  assert.deepEqual(
    buildAssistantClientSeed({
      mode: "client_quick_help",
      activeClientId: null,
      clientName: "  张先生  ",
      userInput: "客户说最近工作压力很大，不想聊保险。",
    }),
    {
      name: "张先生",
      kycSnapshot: {
        clientName: "张先生",
        triggerScenario: "代理人自由描述",
        clientOriginalWords: "客户说最近工作压力很大，不想聊保险。",
        clientObjection: "客户说最近工作压力很大，不想聊保险。",
        step1Notes: "通过路径A轻量建档，信息待后续确认。",
      },
    },
  );

  assert.equal(
    buildAssistantClientSeed({
      mode: "client_quick_help",
      activeClientId: 8,
      clientName: "张先生",
      userInput: "已有客户不重复创建",
    }),
    null,
  );

  assert.equal(
    buildAssistantClientSeed({
      mode: "agent_blueprint",
      activeClientId: null,
      clientName: "张先生",
      userInput: "个人蓝图不创建客户",
    }),
    null,
  );
});
