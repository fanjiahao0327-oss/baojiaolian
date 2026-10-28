import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { evalPrompt } from "../prompts/evalPrompt";
import { generateCoachAnswer } from "./coachAdapter";
import { calculateSummary, normalizeEvaluation, parseEvaluationJson } from "./harness";
import type { EvalCase, EvalResult, EvalRunOutput, Evaluation } from "./types";

const ROOT = process.cwd();
const CASES_PATH = path.join(ROOT, "eval", "cases.json");
const RESULTS_DIR = path.join(ROOT, "eval", "results");

function loadLocalEnv(): void {
  for (const fileName of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(ROOT, fileName));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function createRunId(date = new Date()): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
    + "-"
    + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("-");
}

function validateCases(value: unknown): EvalCase[] {
  if (!Array.isArray(value)) {
    throw new Error("eval/cases.json 必须是数组");
  }
  const seen = new Set<string>();
  return value.map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const required = [
      "case_id",
      "category",
      "title",
      "user_input",
      "expected_points",
      "forbidden_points",
      "notes",
    ];
    for (const key of required) {
      if (!(key in record)) {
        throw new Error(`第 ${index + 1} 个案例缺少字段 ${key}`);
      }
    }
    const caseId = String(record.case_id);
    if (seen.has(caseId)) throw new Error(`重复的 case_id: ${caseId}`);
    seen.add(caseId);
    return record as unknown as EvalCase;
  });
}

export async function loadCases(filePath = CASES_PATH): Promise<EvalCase[]> {
  const raw = await fs.readFile(filePath, "utf8");
  return validateCases(JSON.parse(raw));
}

function buildEvaluationUserPrompt(evalCase: EvalCase, coachAnswer: string): string {
  return JSON.stringify(
    {
      case_id: evalCase.case_id,
      category: evalCase.category,
      title: evalCase.title,
      user_input: evalCase.user_input,
      expected_points: evalCase.expected_points,
      forbidden_points: evalCase.forbidden_points,
      notes: evalCase.notes,
      coach_answer: coachAnswer,
    },
    null,
    2,
  );
}

async function evaluateCoachAnswer(evalCase: EvalCase, coachAnswer: string): Promise<Evaluation> {
  const completion = await getAIClient().chat.completions.create({
    ...noThinkingConfig(),
    messages: [
      { role: "system", content: evalPrompt },
      { role: "user", content: buildEvaluationUserPrompt(evalCase, coachAnswer) },
    ],
    stream: false,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("评测 Agent 未返回内容");
  }
  return parseEvaluationJson(content);
}

function failedEvaluation(message: string): Evaluation {
  return normalizeEvaluation({
    professional_score: 0,
    compliance_score: 0,
    communication_score: 0,
    sales_practicality_score: 0,
    insight_score: 0,
    strengths: [],
    risks: [message],
    missing_points: ["本案例评测未成功完成"],
    rewrite_suggestion: "",
    prompt_improvement_advice: "先修复评测脚本或模型调用错误，再判断该案例的提示词质量。",
  });
}

export function buildFailedEvalResult(
  evalCase: EvalCase,
  coachAnswer: string,
  error: unknown,
): EvalResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    case_id: evalCase.case_id,
    category: evalCase.category,
    title: evalCase.title,
    user_input: evalCase.user_input,
    coach_answer: coachAnswer,
    evaluation: failedEvaluation(message),
    evaluation_error: message,
  };
}

async function runSingleCase(evalCase: EvalCase): Promise<EvalResult> {
  let coachAnswer = "";
  try {
    coachAnswer = await generateCoachAnswer(evalCase);
    const evaluation = await evaluateCoachAnswer(evalCase, coachAnswer);
    return {
      case_id: evalCase.case_id,
      category: evalCase.category,
      title: evalCase.title,
      user_input: evalCase.user_input,
      coach_answer: coachAnswer,
      evaluation,
    };
  } catch (error) {
    return buildFailedEvalResult(evalCase, coachAnswer, error);
  }
}

function printReport(output: EvalRunOutput): void {
  const { summary } = output;
  console.log("");
  console.log("Mini Harness Evaluation Completed");
  console.log("");
  console.log(`Total cases: ${summary.total_cases}`);
  console.log(`Passed: ${summary.passed_cases}`);
  console.log(`Failed: ${summary.failed_cases}`);
  console.log(`Average total score: ${summary.average_total_score}`);
  console.log(`Average compliance score: ${summary.average_compliance_score}`);
  console.log("");
  console.log("Lowest cases:");
  for (const item of summary.lowest_cases) {
    console.log(`- ${item.case_id}: ${item.total_score} 分，原因：${item.reason}`);
  }
  console.log("");
  console.log("Common risks:");
  if (summary.common_risks.length === 0) {
    console.log("- 暂无重复风险");
  } else {
    for (const risk of summary.common_risks) console.log(`- ${risk}`);
  }
  console.log("");
  console.log("Common missing points:");
  if (summary.common_missing_points.length === 0) {
    console.log("- 暂无重复遗漏点");
  } else {
    for (const item of summary.common_missing_points) console.log(`- ${item}`);
  }
}

export async function runEval(): Promise<{ output: EvalRunOutput; resultPath: string }> {
  loadLocalEnv();
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("缺少 DEEPSEEK_API_KEY，请确认 .env.local 或环境变量已配置");
  }

  const cases = await loadCases();
  const runId = createRunId();
  const results: EvalResult[] = [];

  for (const [index, evalCase] of cases.entries()) {
    console.log(`[eval] ${index + 1}/${cases.length} ${evalCase.case_id} ${evalCase.title}`);
    results.push(await runSingleCase(evalCase));
  }

  const output: EvalRunOutput = {
    summary: calculateSummary(results, runId),
    results,
  };
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  const resultPath = path.join(RESULTS_DIR, `eval-result-${runId}.json`);
  await fs.writeFile(resultPath, JSON.stringify(output, null, 2), "utf8");
  printReport(output);
  console.log("");
  console.log(`Saved result: ${resultPath}`);
  return { output, resultPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEval().catch((error) => {
    console.error("[eval] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
