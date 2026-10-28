import { getQuestionsForDimension } from "./question-bank";
import type { Answer, CheckupDimensionId, Question, TriageResult } from "./types";

export interface FollowUpState {
  answers: Answer[];
  triage: TriageResult;
  customerWantsReport: boolean;
  /**
   * 客户在对话中主动提到的维度（非必问、非主/次域）。
   * 只有出现在这里的 mentioned-only 维度才会被追问；不传则不额外追问。
   */
  mentionedDimensions?: CheckupDimensionId[];
}

const MAX_ROUNDS = 12;
const MIN_ROUNDS = 6;

export function shouldStop(state: FollowUpState): boolean {
  if (state.customerWantsReport) return true;
  if (state.answers.length >= MAX_ROUNDS) return true;
  if (state.answers.length < MIN_ROUNDS) return false;
  return selectNextQuestion(state) === null;
}

export function selectNextQuestion(state: FollowUpState): Question | null {
  const answered = new Set(state.answers.map((answer) => answer.questionId));

  // 1. 家庭结构必问（家庭结构决定传承、婚姻、家企风险的判断）
  const family = getUnanswered(getQuestionsForDimension("family"), answered);
  if (family) return family;

  // 2. 已有保障必问
  const protection = getUnanswered(getQuestionsForDimension("protection"), answered);
  if (protection) return protection;

  // 3. 主域深挖
  const primaryQuestions = getQuestionsForDomain(state.triage.primaryDomain);
  const primary = getUnanswered(primaryQuestions, answered);
  if (primary) return primary;

  // 4. 次域深挖
  if (state.triage.secondaryDomain) {
    const secondary = getUnanswered(getQuestionsForDomain(state.triage.secondaryDomain), answered);
    if (secondary) return secondary;
  }

  // 5. 客户提到过的维度，才追问（mentioned-only 维度必须由调用方显式传入）
  const mentionedDimensions = new Set<CheckupDimensionId>([
    ...(state.mentionedDimensions ?? []),
    ...state.answers.map((answer) => answer.dimension),
  ]);
  for (const dimension of mentionedDimensions) {
    const next = getUnanswered(getQuestionsForDimension(dimension), answered);
    if (next) return next;
  }

  return null;
}

function getUnanswered(questions: Question[], answered: Set<string>): Question | null {
  return questions.find((question) => !answered.has(question.id)) ?? null;
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

export { MAX_ROUNDS, MIN_ROUNDS };
