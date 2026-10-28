import assert from "node:assert/strict";
import test from "node:test";
import type { EvalResult } from "./types";

test("Harness exposes deterministic summary helpers", async () => {
  const harness = await import("./harness").catch(() => ({} as Record<string, unknown>));

  assert.equal(typeof harness.calculateSummary, "function");
  assert.equal(typeof harness.normalizeEvaluation, "function");
  assert.equal(typeof harness.parseEvaluationJson, "function");
});

test("summary calculation recomputes averages, failures, and common issues", async () => {
  const harness = await import("./harness");
  const results: EvalResult[] = [
    {
      case_id: "CASE_001",
      category: "compliance",
      title: "案例一",
      user_input: "输入一",
      coach_answer: "回答一",
      evaluation: {
        professional_score: 8,
        compliance_score: 9,
        communication_score: 8,
        sales_practicality_score: 7,
        insight_score: 6,
        total_score: 79,
        pass: true,
        strengths: ["表达克制"],
        risks: ["未提示合同条款、等待期和健康告知"],
        missing_points: ["缺少家庭年度预算追问"],
        rewrite_suggestion: "建议一",
        prompt_improvement_advice: "提示一",
      },
    },
    {
      case_id: "CASE_002",
      category: "needs_diagnosis",
      title: "案例二",
      user_input: "输入二",
      coach_answer: "回答二",
      evaluation: {
        professional_score: 6,
        compliance_score: 7,
        communication_score: 8,
        sales_practicality_score: 6,
        insight_score: 5,
        total_score: 66,
        pass: false,
        strengths: ["有共情"],
        risks: ["缺少等待期提醒"],
        missing_points: ["未追问预算"],
        rewrite_suggestion: "建议二",
        prompt_improvement_advice: "提示二",
      },
    },
  ];

  const summary = harness.calculateSummary(results, "2026-06-08T12:00:00.000Z");

  assert.equal(summary.total_cases, 2);
  assert.equal(summary.passed_cases, 1);
  assert.equal(summary.failed_cases, 1);
  assert.equal(summary.average_total_score, 72.5);
  assert.equal(summary.average_compliance_score, 8);
  assert.equal(summary.lowest_cases[0].case_id, "CASE_002");
  assert.equal(
    summary.common_risks[0],
    "合规提醒不足（合同条款、等待期、健康告知或责任免除）",
  );
  assert.equal(summary.common_missing_points[0], "预算与家庭责任追问不足");
});

test("evaluation normalization clamps dimensions and owns total/pass rules", async () => {
  const harness = await import("./harness");
  const evaluation = harness.normalizeEvaluation({
    professional_score: 12,
    compliance_score: 8,
    communication_score: 7,
    sales_practicality_score: 6,
    insight_score: -1,
    total_score: 100,
    pass: true,
    strengths: ["专业"],
    risks: [],
    missing_points: [],
    rewrite_suggestion: "优化回答",
    prompt_improvement_advice: "优化提示词",
  });

  assert.equal(evaluation.professional_score, 10);
  assert.equal(evaluation.insight_score, 0);
  assert.equal(evaluation.total_score, 70);
  assert.equal(evaluation.pass, false);
});

test("evaluation normalization preserves a stricter severe-misleading total cap", async () => {
  const harness = await import("./harness");
  const evaluation = harness.normalizeEvaluation({
    professional_score: 9,
    compliance_score: 5,
    communication_score: 9,
    sales_practicality_score: 9,
    insight_score: 9,
    total_score: 60,
    pass: false,
    strengths: [],
    risks: ["存在严重误导"],
    missing_points: [],
    rewrite_suggestion: "优化回答",
    prompt_improvement_advice: "优化提示词",
  });

  assert.equal(evaluation.total_score, 60);
  assert.equal(evaluation.pass, false);
});

test("evaluation parser accepts a fenced JSON object", async () => {
  const harness = await import("./harness");
  const parsed = harness.parseEvaluationJson(`\`\`\`json
{
  "professional_score": 7,
  "compliance_score": 8,
  "communication_score": 8,
  "sales_practicality_score": 7,
  "insight_score": 7,
  "total_score": 0,
  "pass": false,
  "strengths": [],
  "risks": [],
  "missing_points": [],
  "rewrite_suggestion": "建议",
  "prompt_improvement_advice": "改进"
}
\`\`\``);

  assert.equal(parsed.total_score, 75);
  assert.equal(parsed.pass, true);
});

test("failed evaluation results keep an already generated coach answer", async () => {
  const runEvalModule = await import("./runEval");

  assert.equal(typeof runEvalModule.buildFailedEvalResult, "function");
  const result = runEvalModule.buildFailedEvalResult(
    {
      case_id: "CASE_999",
      category: "compliance",
      title: "失败案例",
      user_input: "测试输入",
      expected_points: [],
      forbidden_points: [],
      notes: "",
    },
    "已经生成的教练回答",
    new Error("评测 JSON 解析失败"),
  );

  assert.equal(result.coach_answer, "已经生成的教练回答");
  assert.equal(result.evaluation_error, "评测 JSON 解析失败");
});

test("case categories map to existing production coach modes", async () => {
  const adapter = await import("./coachAdapter").catch(() => ({} as Record<string, unknown>));

  assert.equal(typeof adapter.buildCoachRequestForCase, "function");
  const buildCoachRequestForCase = adapter.buildCoachRequestForCase as (
    value: Record<string, unknown>,
  ) => { mode: string; question: string };

  assert.equal(
    buildCoachRequestForCase({
      category: "pre_meeting",
      user_input: "明天第一次见客户",
    }).mode,
    "pre_meeting_prep",
  );
  assert.equal(
    buildCoachRequestForCase({
      category: "objection_handling",
      user_input: "客户说保险都是骗人的",
    }).mode,
    "objection_followup",
  );
  assert.equal(
    buildCoachRequestForCase({
      category: "compliance",
      user_input: "年金险是不是稳赚",
    }).mode,
    "diagnosis",
  );
});

test("shared coach prompt keeps production compliance and mode instructions", async () => {
  const coachPrompt = await import("../src/lib/coach-prompt").catch(
    () => ({} as Record<string, unknown>),
  );

  assert.equal(typeof coachPrompt.buildCoachMessages, "function");
  const buildCoachMessages = coachPrompt.buildCoachMessages as (value: {
    mode: string;
    question: string;
    kycData: Record<string, unknown>;
  }) => { messages: Array<{ role: string; content: string }> };
  const result = buildCoachMessages({
    mode: "pre_meeting_prep",
    question: "第一次见客户，如何开场？",
    kycData: {},
  });

  assert.match(result.messages[0].content, /见前准备模式/);
  assert.match(result.messages[0].content, /最终方案请以保险公司正式条款为准/);
  assert.equal(result.messages.at(-1)?.content, "第一次见客户，如何开场？");
});
