import type { IndexInput } from "./indices";
import type { Answer } from "./types";

const RANGE_VALUES: Record<string, Record<string, number>> = {
  cashflow_income_range: { under30: 250000, "30_60": 450000, "60_100": 800000, over100: 1200000 },
  cashflow_expense_range: { under10: 80000, "10_30": 200000, "30_50": 400000, over50: 600000 },
  protection_medical: { million: 1000000, mid_high: 2000000, social_only: 0 },
  protection_critical: { none: 0, under30: 150000, "30_50": 400000, over50: 600000 },
  protection_life: { both: 1000000, accident_only: 300000, life_only: 800000, none: 0 },
  cashflow_passive: { none: 0, small: 20000, partial: 80000, most: 200000 },
  assets_liquid: { under50: 400000, "50_100": 750000, "100_300": 2000000, over300: 4000000 },
  assets_debt: { none: 0, under100: 500000, "100_300": 2000000, over300: 4000000 },
};

function valueOf(answers: Answer[], questionId: string): string | null {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer || answer.skipped) return null;
  return answer.value;
}

function numberFor(answers: Answer[], questionId: string): number | null {
  const value = valueOf(answers, questionId);
  if (!value) return null;
  const map = RANGE_VALUES[questionId];
  if (!map) return null;
  return map[value] ?? null;
}

/**
 * 从客户答案里尽量还原 5 大指数所需的数据。
 * 只使用客户主动回答过的题；没回答的字段保持 undefined，指数层会标「信息不足」。
 */
export function buildIndexInputFromAnswers(answers: Answer[]): IndexInput {
  return {
    annualIncome: numberFor(answers, "cashflow_income_range"),
    annualExpense: numberFor(answers, "cashflow_expense_range"),
    medicalCoverage: numberFor(answers, "protection_medical"),
    criticalCoverage: numberFor(answers, "protection_critical"),
    lifeCoverage: numberFor(answers, "protection_life"),
    passiveIncome: numberFor(answers, "cashflow_passive"),
    liquidAssets: numberFor(answers, "assets_liquid"),
    totalDebt: numberFor(answers, "assets_debt"),
  };
}
