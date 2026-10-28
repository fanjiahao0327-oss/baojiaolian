import { calcAllIndices, type IndexInput } from "./indices";
import { buildReportUserPrompt } from "./prompts";
import { buildRiskItems } from "./risk-rules";
import type { Answer, CheckupReport, TriageResult } from "./types";

const DISCLAIMER = "本报告由 AI 辅助生成，仅供风险自查参考，不构成保险产品推荐、投保建议或法律意见。最终方案请以保险公司正式条款和专业人士意见为准。";

function answerLabel(answers: Answer[], questionId: string, labels: Record<string, string>): string {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer || answer.skipped) return "信息不足";
  return labels[answer.value] ?? answer.value;
}

export function buildProfile(answers: Answer[]): CheckupReport["profile"] {
  const household = answerLabel(answers, "family_members", {
    couple: "夫妻两人",
    children: "夫妻与孩子",
    three_gen: "三代同堂",
    other: "其他",
  });
  const children = answerLabel(answers, "family_children", {
    school: "孩子还在上学",
    working: "孩子已工作未婚",
    married: "孩子已结婚",
    none: "还没有孩子",
  });
  const siblings = answerLabel(answers, "family_siblings", {
    only_child: "独生子女",
    harmony: "有兄弟姐妹，关系正常",
    conflict: "有兄弟姐妹，有分歧",
    skip: "兄弟姐妹情况未提供",
  });
  return {
    familyStructure: `家庭结构：${household}；${children}；${siblings}`,
    lifeStage: "家庭成长期 / 责任期",
    summary: "本次测评基于你主动提供的信息，未提供的数据按「信息不足」处理。",
  };
}

export function buildBudgetRange(input: IndexInput): CheckupReport["budgetRange"] {
  if (typeof input.annualIncome !== "number" || typeof input.annualExpense !== "number") {
    return { min: null, max: null, basis: "信息不足", disclaimer: "预算参考，非保费报价，非产品推荐" };
  }
  const surplus = Math.max(0, input.annualIncome - input.annualExpense);
  return {
    min: Math.round((surplus * 0.1) / 1000) * 1000,
    max: Math.round((surplus * 0.2) / 1000) * 1000,
    basis: "按家庭年结余的 10%–20% 估算",
    disclaimer: "预算参考，非保费报价，非产品推荐",
  };
}

export function buildReport(params: {
  answers: Answer[];
  triage: TriageResult;
  input: IndexInput;
}): CheckupReport {
  const indices = calcAllIndices(params.input);
  const risks = buildRiskItems(params.answers, indices);
  return {
    profile: buildProfile(params.answers),
    wealthIndices: indices,
    topRisks: risks,
    actionPlan: [
      { period: "30 天内", action: "补 3–6 个月家庭应急金，核对现有保单的保障责任", owner: "你与家人" },
      { period: "60 天内", action: "梳理家庭结构图与资产清单，确认给谁、谁管、怎么给", owner: "你" },
      { period: "90 天内", action: "带着报告做一次一对一诊断，核对合同与真实体况", owner: "你与顾问" },
    ],
    budgetRange: buildBudgetRange(params.input),
    nextStep: "报告只是自查参考。想落地，建议预约一次一对一诊断，补充家庭结构、资产和现有保单信息。",
    disclaimer: DISCLAIMER,
  };
}

export function toFreeReport(report: CheckupReport): CheckupReport {
  return {
    ...report,
    topRisks: report.topRisks.slice(0, 3).map((risk) => ({
      ...risk,
      phenomenon: risk.phenomenon.slice(0, 40),
      whyItMatters: "",
      ifIgnored: "",
      suggestedAction: "",
    })),
    actionPlan: [],
    budgetRange: { min: null, max: null, basis: "完整版解锁后查看", disclaimer: "预算参考，非保费报价，非产品推荐" },
  };
}

export function reportToText(report: CheckupReport): string {
  const lines: string[] = ["AI家庭风险测评报告", "", "一、家庭画像", report.profile.familyStructure, report.profile.summary, "", "二、家庭财富平衡 5 大指数"];
  for (const index of report.wealthIndices) {
    lines.push(`- ${index.name}：${index.score === null ? "信息不足" : `${index.score} 分`}`);
  }
  lines.push("", "三、Top 5 风险");
  for (const risk of report.topRisks) {
    lines.push(`- ${risk.title}：${risk.ifIgnored || risk.whyItMatters || ""}`);
  }
  lines.push("", "四、90 天行动清单");
  for (const item of report.actionPlan) lines.push(`- ${item.period}：${item.action}`);
  lines.push("", "五、免责声明", report.disclaimer);
  return lines.join("\n");
}

/**
 * 用 AI 改写报告文案；指数分数、预算和免责声明始终沿用规则生成的 draft。
 * AI 返回非法 JSON、空内容或调用抛错时，直接降级为原 draft。
 */
export async function enhanceReport(
  draft: CheckupReport,
  callAI: (prompt: string) => Promise<string>,
): Promise<CheckupReport> {
  try {
    const raw = await callAI(buildReportUserPrompt({
      profile: draft.profile.summary,
      indices: draft.wealthIndices,
      risks: draft.topRisks,
      answers: [],
    }));
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<CheckupReport>;
    return {
      ...draft,
      profile: { ...draft.profile, ...(parsed.profile ?? {}) },
      topRisks: Array.isArray(parsed.topRisks) && parsed.topRisks.length > 0 ? parsed.topRisks.slice(0, 5) : draft.topRisks,
      actionPlan: Array.isArray(parsed.actionPlan) && parsed.actionPlan.length > 0 ? parsed.actionPlan : draft.actionPlan,
      nextStep: typeof parsed.nextStep === "string" && parsed.nextStep.trim() ? parsed.nextStep : draft.nextStep,
    };
  } catch {
    return draft;
  }
}
