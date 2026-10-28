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
  assets_fixed: { under100: 500000, "100_300": 2000000, "300_500": 4000000, "500_1000": 7500000, over1000: 12000000 },
  assets_debt: { none: 0, under100: 500000, "100_300": 2000000, over300: 4000000 },
  assets_inheritance: { none: 0, under50: 250000, "50_200": 1250000, "200_500": 3500000, over500: 7000000 },
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
 * 只使用客户主动回答过的题；没回答的字段保持 null，指数层会标「信息不足」。
 */
export function buildIndexInputFromAnswers(answers: Answer[]): IndexInput {
  const liquidAssets = numberFor(answers, "assets_liquid");
  const fixedAssets = numberFor(answers, "assets_fixed");
  const totalAssets =
    liquidAssets === null && fixedAssets === null ? null : (liquidAssets ?? 0) + (fixedAssets ?? 0);

  return {
    annualIncome: numberFor(answers, "cashflow_income_range"),
    annualExpense: numberFor(answers, "cashflow_expense_range"),
    medicalCoverage: numberFor(answers, "protection_medical"),
    criticalCoverage: numberFor(answers, "protection_critical"),
    lifeCoverage: numberFor(answers, "protection_life"),
    passiveIncome: numberFor(answers, "cashflow_passive"),
    liquidAssets,
    totalAssets,
    totalDebt: numberFor(answers, "assets_debt"),
    inheritanceAssets: numberFor(answers, "assets_inheritance"),
  };
}
