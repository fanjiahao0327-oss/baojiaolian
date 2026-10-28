export type CheckupDimensionId =
  | "family"
  | "protection"
  | "inheritance"
  | "cashflow"
  | "assets"
  | "health"
  | "education"
  | "retirement"
  | "business"
  | "marriage";

export type CheckupDomain =
  | "protection"
  | "medical"
  | "education"
  | "retirement"
  | "inheritance"
  | "business"
  | "marriage";

export type AskPolicy = "must" | "main_domain" | "mentioned_only";

export interface DimensionDefinition {
  id: CheckupDimensionId;
  label: string;
  fields: string[];
  askPolicy: AskPolicy;
  weight: number;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  dimension: CheckupDimensionId;
  field: string;
  prompt: string;
  options: QuestionOption[];
  allowFreeText: boolean;
  required: boolean;
  weight: number;
  hint?: string;
  example?: string;
  open?: boolean;
}

export interface Answer {
  questionId: string;
  dimension: CheckupDimensionId;
  field: string;
  value: string;
  freeText?: string;
  skipped: boolean;
}

export type RiskLevel = "green" | "yellow" | "red" | "unknown";
export type DataStatus = "enough" | "partial" | "insufficient";

export interface WealthIndexScore {
  name: "安全指数" | "流动指数" | "自由指数" | "独立指数" | "传承指数";
  score: number | null;
  level: RiskLevel;
  dataStatus: DataStatus;
  reason: string;
}

export interface RiskItem {
  title: string;
  severity: "high" | "medium" | "low";
  phenomenon: string;
  whyItMatters: string;
  ifIgnored: string;
  suggestedAction: string;
  sourceRefs: string[];
}

export interface ActionItem {
  period: string;
  action: string;
  owner: string;
}

export interface BudgetRange {
  min: number | null;
  max: number | null;
  basis: string;
  disclaimer: string;
}

export interface CheckupReportDetailSection {
  title: string;
  paragraphs: string[];
}

export interface CheckupReport {
  profile: {
    familyStructure: string;
    lifeStage: string;
    summary: string;
  };
  wealthIndices: WealthIndexScore[];
  topRisks: RiskItem[];
  actionPlan: ActionItem[];
  budgetRange: BudgetRange;
  nextStep: string;
  disclaimer: string;
  detailSections?: CheckupReportDetailSection[];
}

export interface SessionPayload {
  sessionId: string;
  iat: number;
  exp: number;
}

export interface TriageResult {
  primaryDomain: CheckupDomain;
  secondaryDomain: CheckupDomain | null;
  confidence: number;
  signals: string[];
}
