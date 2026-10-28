import type { DataStatus, RiskLevel, WealthIndexScore } from "./types";

export interface IndexInput {
  annualIncome?: number | null;
  annualExpense?: number | null;
  liquidAssets?: number | null;
  totalAssets?: number | null;
  totalDebt?: number | null;
  medicalCoverage?: number | null;
  criticalCoverage?: number | null;
  lifeCoverage?: number | null;
  passiveIncome?: number | null;
  inheritanceAssets?: number | null;
  lifeDebt?: number | null;
}

export interface IndexResult {
  score: number | null;
  dataStatus: DataStatus;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelOf(score: number | null, green: number, yellow: number): RiskLevel {
  if (score === null) return "unknown";
  if (score >= green) return "green";
  if (score >= yellow) return "yellow";
  return "red";
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

export function calcSafety(input: IndexInput): IndexResult {
  if (!input.annualIncome || input.annualIncome <= 0 || !input.annualExpense || input.annualExpense <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  const balance = clamp((1 - input.annualExpense / input.annualIncome) * 100);
  const debtBalance =
    typeof input.totalAssets === "number" && input.totalAssets > 0 && typeof input.totalDebt === "number"
      ? clamp((1 - input.totalDebt / input.totalAssets) * 100)
      : null;
  const cash =
    typeof input.liquidAssets === "number"
      ? clamp(Math.min(1, input.liquidAssets / (input.annualExpense / 2)) * 100)
      : null;
  const medical =
    typeof input.medicalCoverage === "number"
      ? clamp(Math.min(1, input.medicalCoverage / 1000000) * 100)
      : null;
  const critical =
    typeof input.criticalCoverage === "number"
      ? clamp(Math.min(1, input.criticalCoverage / (5 * input.annualIncome)) * 100)
      : null;
  const life =
    typeof input.lifeCoverage === "number"
      ? clamp(Math.min(1, input.lifeCoverage / (10 * input.annualIncome)) * 100)
      : null;
  const present = [balance, debtBalance, cash, medical, critical, life].filter((value) => value !== null);
  const score = average(present);
  const dataStatus: DataStatus = present.length >= 6 ? "enough" : present.length >= 3 ? "partial" : "insufficient";
  return { score, dataStatus };
}

export function calcLiquidity(input: IndexInput): IndexResult {
  if (typeof input.liquidAssets !== "number" || typeof input.totalAssets !== "number" || input.totalAssets <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp((input.liquidAssets / input.totalAssets) * 100), dataStatus: "enough" };
}

export function calcFreedom(input: IndexInput): IndexResult {
  if (typeof input.passiveIncome !== "number" || typeof input.annualExpense !== "number" || input.annualExpense <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp(Math.min(1, input.passiveIncome / input.annualExpense) * 100), dataStatus: "enough" };
}

export function calcIndependence(input: IndexInput): IndexResult {
  const lifeDebt =
    typeof input.lifeDebt === "number"
      ? input.lifeDebt
      : typeof input.annualExpense === "number"
        ? input.annualExpense * 25 + (input.totalDebt ?? 0)
        : null;
  if (typeof input.totalAssets !== "number" || !lifeDebt || lifeDebt <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp(Math.min(1, input.totalAssets / lifeDebt) * 100), dataStatus: "enough" };
}

export function calcInheritance(input: IndexInput): IndexResult {
  if (typeof input.inheritanceAssets !== "number" || typeof input.totalAssets !== "number" || input.totalAssets <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp((input.inheritanceAssets / input.totalAssets) * 100), dataStatus: "enough" };
}

export function calcAllIndices(input: IndexInput): WealthIndexScore[] {
  const safety = calcSafety(input);
  const liquidity = calcLiquidity(input);
  const freedom = calcFreedom(input);
  const independence = calcIndependence(input);
  const inheritance = calcInheritance(input);
  return [
    { name: "安全指数", score: safety.score, level: levelOf(safety.score, 80, 40), dataStatus: safety.dataStatus, reason: "" },
    { name: "流动指数", score: liquidity.score, level: levelOf(liquidity.score, 51, 21), dataStatus: liquidity.dataStatus, reason: "" },
    { name: "自由指数", score: freedom.score, level: levelOf(freedom.score, 100, 50), dataStatus: freedom.dataStatus, reason: "" },
    { name: "独立指数", score: independence.score, level: levelOf(independence.score, 100, 60), dataStatus: independence.dataStatus, reason: "" },
    { name: "传承指数", score: inheritance.score, level: levelOf(inheritance.score, 50, 20), dataStatus: inheritance.dataStatus, reason: "" },
  ];
}
