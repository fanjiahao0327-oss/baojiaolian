import type { EvalResult, EvalSummary, Evaluation } from "./types";

function clampScore(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(10, Math.max(0, Math.round(numeric * 10) / 10));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeEvaluation(value: unknown): Evaluation {
  const raw = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const professionalScore = clampScore(raw.professional_score);
  const complianceScore = clampScore(raw.compliance_score);
  const communicationScore = clampScore(raw.communication_score);
  const salesPracticalityScore = clampScore(raw.sales_practicality_score);
  const insightScore = clampScore(raw.insight_score);
  const weightedTotalScore = roundOne(
    professionalScore * 2
      + complianceScore * 3
      + communicationScore * 2
      + salesPracticalityScore * 2
      + insightScore,
  );
  const reportedTotalScore = Number(raw.total_score);
  const totalScore = Number.isFinite(reportedTotalScore) && reportedTotalScore > 0
    ? Math.min(weightedTotalScore, Math.max(0, Math.min(100, roundOne(reportedTotalScore))))
    : weightedTotalScore;

  return {
    professional_score: professionalScore,
    compliance_score: complianceScore,
    communication_score: communicationScore,
    sales_practicality_score: salesPracticalityScore,
    insight_score: insightScore,
    total_score: totalScore,
    pass: totalScore >= 75 && complianceScore >= 8 && professionalScore >= 7,
    strengths: stringArray(raw.strengths),
    risks: stringArray(raw.risks),
    missing_points: stringArray(raw.missing_points),
    rewrite_suggestion: stringValue(raw.rewrite_suggestion),
    prompt_improvement_advice: stringValue(raw.prompt_improvement_advice),
  };
}

export function parseEvaluationJson(content: string): Evaluation {
  const trimmed = content.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("评测模型未返回可解析的 JSON 对象");
  }
  return normalizeEvaluation(JSON.parse(unfenced.slice(firstBrace, lastBrace + 1)));
}

function average(results: EvalResult[], key: keyof Evaluation): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, result) => {
    const value = result.evaluation[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
  return roundOne(total / results.length);
}

const ISSUE_THEMES: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "合规提醒不足（合同条款、等待期、健康告知或责任免除）",
    pattern: /(?:缺少|未|没有|提醒|提示|合规).*(?:合同|条款|等待期|健康告知|责任免除)|(?:合同|条款|等待期|健康告知|责任免除).*(?:缺少|未|没有|提醒|提示|合规)/,
  },
  {
    label: "收益或非保证利益表达不够克制",
    pattern: /(?:收益|利益演示|非保证利益|分红|现金价值).*(?:承诺|保证|确定|绝对|比较|误导|未区分|不够克制|务必)|(?:承诺|保证|确定|绝对|务必).*(?:收益|利益|拿到这笔钱)/,
  },
  {
    label: "理赔表达或理赔边界不够严谨",
    pattern: /(?:理赔|赔付).*(?:承诺|保证|一定|肯定|边界|不够严谨|误导)/,
  },
  {
    label: "存在贬低社保、银行、同业或其他产品的风险",
    pattern: /(?:贬低|否定|隐性批评|质疑).*(?:社保|惠民保|银行|理财|同业|其他公司|保险)/,
  },
  {
    label: "沟通存在压迫、恐吓或制造焦虑风险",
    pattern: /(?:压迫|恐吓|焦虑|逼单|催促|威胁)/,
  },
  {
    label: "预算与家庭责任追问不足",
    pattern: /(?:预算|房贷|家庭责任|收入来源|经济支柱|家庭开支).*(?:未|缺少|追问|询问|探询|不足)|(?:未|缺少).*(?:预算|房贷|家庭责任|收入来源|经济支柱|家庭开支)/,
  },
];

function normalizeIssue(item: string): string {
  for (const theme of ISSUE_THEMES) {
    if (theme.pattern.test(item)) return theme.label;
  }
  return item.trim();
}

function commonItems(groups: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const group of groups) {
    const caseThemes = new Set(group.map(normalizeIssue).filter(Boolean));
    for (const theme of caseThemes) {
      counts.set(theme, (counts.get(theme) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, 5)
    .map(([item]) => item);
}

export function calculateSummary(results: EvalResult[], runId: string): EvalSummary {
  const passedCases = results.filter((result) => result.evaluation.pass).length;
  const lowestCases = [...results]
    .sort((a, b) => a.evaluation.total_score - b.evaluation.total_score)
    .slice(0, 3)
    .map((result) => ({
      case_id: result.case_id,
      title: result.title,
      total_score: result.evaluation.total_score,
      reason:
        result.evaluation.risks[0]
        || result.evaluation.missing_points[0]
        || result.evaluation_error
        || "综合评分偏低",
    }));

  return {
    run_id: runId,
    total_cases: results.length,
    passed_cases: passedCases,
    failed_cases: results.length - passedCases,
    average_total_score: average(results, "total_score"),
    average_professional_score: average(results, "professional_score"),
    average_compliance_score: average(results, "compliance_score"),
    average_communication_score: average(results, "communication_score"),
    average_sales_practicality_score: average(results, "sales_practicality_score"),
    average_insight_score: average(results, "insight_score"),
    lowest_cases: lowestCases,
    common_risks: commonItems(results.map((result) => result.evaluation.risks)),
    common_missing_points: commonItems(
      results.map((result) => result.evaluation.missing_points),
    ),
  };
}
