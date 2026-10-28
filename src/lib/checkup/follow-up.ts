import { getQuestionById, getQuestionsForDimension } from "./question-bank";
import type { Answer, CheckupDimensionId, Question, TriageResult } from "./types";

export interface FollowUpState {
  answers: Answer[];
  triage: TriageResult;
  customerWantsReport: boolean;
  mentionedDimensions?: CheckupDimensionId[];
}

export const MAX_ROUNDS = 24;
export const MIN_ROUNDS = 12;

/** 这 7 题决定 5 大指数能不能算出来；客户可以跳过，但会主动问。 */
const CORE_FINANCIAL_IDS = [
  "cashflow_income_range",
  "cashflow_expense_range",
  "cashflow_passive",
  "assets_liquid",
  "assets_fixed",
  "assets_debt",
  "assets_inheritance",
];

interface TriggerRule {
  when: (answers: Answer[]) => boolean;
  questionId: string;
}

const TRIGGER_RULES: TriggerRule[] = [
  { when: (a) => valueOf(a, "family_children") === "married", questionId: "inheritance_children_marriage" },
  { when: (a) => ["self", "family"].includes(valueOf(a, "family_business") ?? ""), questionId: "business_guarantee" },
  {
    when: (a) =>
      ["none", "under30"].includes(valueOf(a, "protection_critical") ?? "") ||
      valueOf(a, "protection_medical") === "social_only",
    questionId: "health_conditions",
  },
  { when: (a) => ["self", "family"].includes(valueOf(a, "family_business") ?? ""), questionId: "business_succession" },
  {
    when: (a) => {
      const value = valueOf(a, "inheritance_intent");
      return value !== null && !["never", "young"].includes(value);
    },
    questionId: "inheritance_when",
  },
  {
    when: (a) => {
      const value = valueOf(a, "inheritance_intent");
      return value !== null && !["never", "young"].includes(value);
    },
    questionId: "inheritance_control",
  },
  { when: (a) => valueOf(a, "business_guarantee") === "yes", questionId: "business_debt" },
  {
    when: (a) => ["remarried", "divorced"].includes(valueOf(a, "marriage_status") ?? ""),
    questionId: "marriage_assets",
  },
  {
    when: (a) => ["remarried", "divorced"].includes(valueOf(a, "marriage_status") ?? ""),
    questionId: "marriage_spouse_debt",
  },
  { when: (a) => ["school", "working"].includes(valueOf(a, "family_children") ?? ""), questionId: "education_stage" },
  { when: (a) => valueOf(a, "education_plan") === "abroad", questionId: "education_budget" },
  { when: (a) => valueOf(a, "retirement_age") !== null, questionId: "retirement_income" },
  { when: (a) => valueOf(a, "retirement_income") !== null, questionId: "retirement_cashflow" },
];

function valueOf(answers: Answer[], questionId: string): string | null {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer || answer.skipped) return null;
  return answer.value;
}

function answeredIds(answers: Answer[]): Set<string> {
  return new Set(answers.map((answer) => answer.questionId));
}

function getUnanswered(questions: Question[], answered: Set<string>): Question | null {
  return questions.find((question) => !answered.has(question.id)) ?? null;
}

function triggeredQuestion(answers: Answer[]): Question | null {
  const answered = answeredIds(answers);
  for (const rule of TRIGGER_RULES) {
    if (!rule.when(answers)) continue;
    if (answered.has(rule.questionId)) continue;
    const question = getQuestionById(rule.questionId);
    if (question) return question;
  }
  return null;
}

function getQuestionsForDomain(domain: TriageResult["primaryDomain"]): Question[] {
  if (domain === "protection" || domain === "medical") return getQuestionsForDimension("protection");
  if (domain === "inheritance") return getQuestionsForDimension("inheritance");
  if (domain === "retirement") return getQuestionsForDimension("retirement");
  if (domain === "education") return getQuestionsForDimension("education");
  if (domain === "business") return getQuestionsForDimension("business");
  if (domain === "marriage") return getQuestionsForDimension("marriage");
  return [];
}

export function shouldStop(state: FollowUpState): boolean {
  if (state.customerWantsReport) return true;
  if (state.answers.length >= MAX_ROUNDS) return true;
  if (state.answers.length < MIN_ROUNDS) return false;
  return selectNextQuestion(state) === null;
}

export function selectNextQuestion(state: FollowUpState): Question | null {
  const answered = answeredIds(state.answers);

  // 1. 家庭结构（6 题，含婚姻状态、兄弟姐妹）
  const family = getUnanswered(getQuestionsForDimension("family"), answered);
  if (family) return family;

  // 2. 已有保障（5 题，含保单角色）
  const protection = getUnanswered(getQuestionsForDimension("protection"), answered);
  if (protection) return protection;

  // 3. 先插一个由客户答案触发的追问（例如孩子已婚 → 婚前/婚后给）
  const earlyTrigger = triggeredQuestion(state.answers);
  if (earlyTrigger) return earlyTrigger;

  // 4. 财务基线：确保愿意回答的客户能算出 5 大指数
  for (const id of CORE_FINANCIAL_IDS) {
    if (answered.has(id)) continue;
    const question = getQuestionById(id);
    if (question) return question;
  }

  // 5. 主风险域深挖
  const primary = getUnanswered(getQuestionsForDomain(state.triage.primaryDomain), answered);
  if (primary) return primary;

  // 6. 其余由答案触发的追问
  const lateTrigger = triggeredQuestion(state.answers);
  if (lateTrigger) return lateTrigger;

  // 7. 次风险域
  if (state.triage.secondaryDomain) {
    const secondary = getUnanswered(getQuestionsForDomain(state.triage.secondaryDomain), answered);
    if (secondary) return secondary;
  }

  // 8. 客户明确提到过的维度
  const mentioned = new Set<CheckupDimensionId>([
    ...(state.mentionedDimensions ?? []),
    ...state.answers.map((answer) => answer.dimension),
  ]);
  for (const dimension of mentioned) {
    const next = getUnanswered(getQuestionsForDimension(dimension), answered);
    if (next) return next;
  }

  return null;
}

export function applyAnswer(
  state: FollowUpState,
  question: Question,
  input: { value: string; freeText?: string; skipped?: boolean },
): FollowUpState {
  const answer: Answer = {
    questionId: question.id,
    dimension: question.dimension,
    field: question.field,
    value: input.value,
    freeText: input.freeText,
    skipped: input.skipped ?? false,
  };
  return { ...state, answers: [...state.answers, answer] };
}

export function progressLabel(state: FollowUpState): string {
  return `${Math.min(state.answers.length, MAX_ROUNDS)}/${MAX_ROUNDS}`;
}
