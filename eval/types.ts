export type EvalCategory =
  | "pre_meeting"
  | "needs_diagnosis"
  | "script_rewrite"
  | "compliance"
  | "objection_handling";

export interface EvalCase {
  case_id: string;
  category: EvalCategory;
  title: string;
  user_input: string;
  expected_points: string[];
  forbidden_points: string[];
  notes: string;
}

export interface Evaluation {
  professional_score: number;
  compliance_score: number;
  communication_score: number;
  sales_practicality_score: number;
  insight_score: number;
  total_score: number;
  pass: boolean;
  strengths: string[];
  risks: string[];
  missing_points: string[];
  rewrite_suggestion: string;
  prompt_improvement_advice: string;
}

export interface EvalResult {
  case_id: string;
  category: EvalCategory;
  title: string;
  user_input: string;
  coach_answer: string;
  evaluation: Evaluation;
  evaluation_error?: string;
}

export interface LowestCase {
  case_id: string;
  title: string;
  total_score: number;
  reason: string;
}

export interface EvalSummary {
  run_id: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  average_total_score: number;
  average_professional_score: number;
  average_compliance_score: number;
  average_communication_score: number;
  average_sales_practicality_score: number;
  average_insight_score: number;
  lowest_cases: LowestCase[];
  common_risks: string[];
  common_missing_points: string[];
}

export interface EvalRunOutput {
  summary: EvalSummary;
  results: EvalResult[];
}
