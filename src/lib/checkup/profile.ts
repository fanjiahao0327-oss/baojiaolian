import { getQuestionById, QUESTION_BANK } from "./question-bank";
import type { Answer, CheckupDimensionId, Question } from "./types";

export type Occupation = "employee" | "business_owner" | "family_business" | "retired" | "other" | "unknown";

export type ConcernKey = "health" | "inheritance" | "retirement" | "business" | "marriage" | "education" | "family";

export interface IntakeProfile {
  occupation: Occupation;
  concerns: ConcernKey[];
  /** questionId -> option value；只放客户已经明确说过的信息 */
  fields: Record<string, string>;
  openingText: string;
  reflection: string;
}

export const CONCERN_LABELS: Record<ConcernKey, string> = {
  health: "健康/医疗",
  inheritance: "传承/继承",
  retirement: "退休/养老",
  business: "企业/债务",
  marriage: "婚姻/财产",
  education: "子女教育",
  family: "家庭结构",
};

const BASE_FAMILY_IDS = [
  "family_members",
  "family_children",
  "family_parents",
  "family_siblings",
  "family_business",
  "marriage_status",
];
const BASE_PROTECTION_IDS = [
  "protection_medical",
  "protection_critical",
  "protection_life",
  "protection_runway",
  "protection_policy_roles",
];
const CORE_FINANCIAL_IDS = [
  "cashflow_income_range",
  "cashflow_expense_range",
  "cashflow_passive",
  "assets_liquid",
  "assets_fixed",
  "assets_debt",
  "assets_inheritance",
];

export function emptyProfile(): IntakeProfile {
  return { occupation: "unknown", concerns: [], fields: {}, openingText: "", reflection: "" };
}

export function mergeProfile(base: IntakeProfile, patch: Partial<IntakeProfile>): IntakeProfile {
  return {
    occupation: patch.occupation && patch.occupation !== "unknown" ? patch.occupation : base.occupation,
    concerns: Array.from(new Set([...base.concerns, ...(patch.concerns ?? [])])),
    fields: { ...base.fields, ...(patch.fields ?? {}) },
    openingText: patch.openingText || base.openingText,
    reflection: patch.reflection || base.reflection,
  };
}

function pushField(fields: Record<string, string>, id: string, value: string | undefined) {
  if (!value || value === "unknown" || value === "skip") return;
  const question = getQuestionById(id);
  if (!question) return;
  if (!question.options.some((option) => option.value === value)) return;
  fields[id] = value;
}

function occupationFromText(text: string): Occupation {
  if (/配偶|老公|老婆|爱人/.test(text) && /(公司|企业|生意|经营|开店|工厂)/.test(text)) return "family_business";
  if (/(自己|我).{0,12}(开公司|办企业|做生意|创业|经营|开店|工厂|股东|合伙)/.test(text)) return "business_owner";
  if (/(公司|企业|生意|工厂|店铺|股权|个体户|老板)/.test(text)) return "business_owner";
  if (/退休/.test(text)) return "retired";
  if (/(职工|上班|打工|员工|白领|教师|公务员|医生|护士|程序员|国企|事业单位)/.test(text)) return "employee";
  return "unknown";
}

function concernsFromText(text: string): ConcernKey[] {
  const concerns: ConcernKey[] = [];
  if (/(生病|大病|医疗|住院|手术|健康|癌症|体检|重疾)/.test(text)) concerns.push("health");
  if (/(传承|继承|遗嘱|信托|受益人|留给孩子|给孩子的钱|家产|家业)/.test(text)) concerns.push("inheritance");
  if (/(退休|养老|养老金)/.test(text)) concerns.push("retirement");
  if (/(企业|公司|生意|工厂|股权|担保|经营贷|负债|贷款)/.test(text)) concerns.push("business");
  if (/(再婚|二婚|离婚|离异|前妻|前夫|婚姻|配偶)/.test(text)) concerns.push("marriage");
  if (/(教育|留学|出国|上学|学区|国际学校|孩子.*读书)/.test(text)) concerns.push("education");
  if (/(孩子|儿子|女儿|父母|兄弟姐妹|家庭)/.test(text)) concerns.push("family");
  return Array.from(new Set(concerns));
}

/** 没有模型可用时的保底解析；只取客户明确说过的信息，不猜数字。 */
export function deriveProfileFromText(text: string): IntakeProfile {
  const fields: Record<string, string> = {};
  const occupation = occupationFromText(text);

  if (occupation === "business_owner") pushField(fields, "family_business", "self");
  if (occupation === "family_business") pushField(fields, "family_business", "family");
  if (occupation === "employee" || occupation === "retired") pushField(fields, "family_business", "none");

  if (/(没有孩子|没孩子|无子女|丁克|还没有孩子)/.test(text)) pushField(fields, "family_children", "none");
  else if (/(孩子|儿子|女儿).{0,8}(结婚|已婚)|(儿子|女儿).{0,4}(刚|已经)?结婚/.test(text)) pushField(fields, "family_children", "married");
  else if (/(孩子|儿子|女儿).{0,10}(工作|上班|未婚)/.test(text)) pushField(fields, "family_children", "working");
  else if (/(孩子|儿子|女儿).{0,10}(小学|中学|高中|大学|留学|上学|幼儿园|读书)/.test(text)) pushField(fields, "family_children", "school");

  if (/(再婚|二婚)/.test(text)) pushField(fields, "marriage_status", "remarried");
  else if (/(离婚|离异)/.test(text)) pushField(fields, "marriage_status", "divorced");
  else if (/丧偶/.test(text)) pushField(fields, "marriage_status", "widowed");
  else if (/(我|本人).{0,4}(已婚|结婚了)/.test(text)) pushField(fields, "marriage_status", "first");

  if (/独生/.test(text)) pushField(fields, "family_siblings", "only_child");
  else if (/(兄弟姐妹|哥哥|姐姐|弟弟|妹妹)/.test(text)) pushField(fields, "family_siblings", "harmony");

  if (/父母.{0,8}(身体|健康|不需要)/.test(text)) pushField(fields, "family_parents", "healthy");
  else if (/父母.{0,8}(照顾|赡养|养老)/.test(text)) pushField(fields, "family_parents", "care");

  if (/(只有社保|没有商业保险|没买商业保险|只有医保)/.test(text)) pushField(fields, "protection_medical", "social_only");
  else if (/(百万医疗|百万医疗险)/.test(text)) pushField(fields, "protection_medical", "million");
  else if (/(中高端医疗|高端医疗)/.test(text)) pushField(fields, "protection_medical", "mid_high");

  if (/(没有重疾|没买重疾|重疾.*没有)/.test(text)) pushField(fields, "protection_critical", "none");
  else if (/重疾/.test(text) && /(30|50|保额)/.test(text)) pushField(fields, "protection_critical", "30_50");

  if (/(没有寿险|没有意外|都没有)/.test(text)) pushField(fields, "protection_life", "none");
  else if (/寿险|意外险/.test(text)) pushField(fields, "protection_life", "both");

  if (/(保单|投保人|被保险人|受益人)/.test(text)) {
    if (/(不清楚|不知道|忘了)/.test(text)) pushField(fields, "protection_policy_roles", "unknown");
    else pushField(fields, "protection_policy_roles", "partial");
  }

  if (/(个人担保|连带担保|个人连带|用.*房子.*抵押|担保)/.test(text)) pushField(fields, "business_guarantee", "yes");
  else if (/没有.*担保|没有对外担保/.test(text)) pushField(fields, "business_guarantee", "none");

  if (/(遗嘱|信托|保险金信托)/.test(text)) {
    if (/信托/.test(text)) pushField(fields, "inheritance_tools", "trust");
    else if (/遗嘱/.test(text)) pushField(fields, "inheritance_tools", "will");
  } else if (/没有.*安排|还没.*安排|没做安排/.test(text)) {
    pushField(fields, "inheritance_tools", "none");
  }

  if (/(体检异常|结节|高血压|糖尿病|手术|住院)/.test(text)) {
    pushField(fields, "health_conditions", /(控制|复查|稳定)/.test(text) ? "controlled" : "treating");
  }

  if (/(留学|出国|国际学校)/.test(text)) pushField(fields, "education_plan", "abroad");

  return {
    occupation,
    concerns: concernsFromText(text),
    fields,
    openingText: text,
    reflection: "",
  };
}

export function applyAnswerToProfile(profile: IntakeProfile, answer: Answer): IntakeProfile {
  const next = mergeProfile(profile, {});
  if (answer.questionId === "opening") {
    const derived = deriveProfileFromText(answer.freeText || "");
    return mergeProfile(next, {
      ...derived,
      openingText: answer.freeText || "",
      concerns: Array.from(new Set([...next.concerns, ...derived.concerns])),
      fields: { ...next.fields, ...derived.fields },
    });
  }
  if (answer.questionId === "summary_note") {
    const derived = deriveProfileFromText(answer.freeText || "");
    return mergeProfile(next, {
      occupation: derived.occupation,
      concerns: derived.concerns,
      fields: derived.fields,
    });
  }
  if (answer.questionId === "direction") {
    next.fields.__direction = answer.value;
    return next;
  }
  if (answer.questionId === "opening_followup") {
    const derived = deriveProfileFromText(answer.freeText || "");
    return mergeProfile(next, {
      occupation: derived.occupation,
      concerns: derived.concerns,
      fields: derived.fields,
    });
  }
  if (!answer.skipped) {
    const question = getQuestionById(answer.questionId);
    if (question) {
      const value = answer.value === "free_text" ? "" : answer.value;
      if (value) next.fields[answer.questionId] = value;
    }
  }
  const derivedText = [answer.freeText, answer.value].filter(Boolean).join(" ");
  if (answer.freeText) {
    const derived = deriveProfileFromText(derivedText);
    next.concerns = Array.from(new Set([...next.concerns, ...derived.concerns]));
    for (const [id, value] of Object.entries(derived.fields)) {
      if (!next.fields[id]) next.fields[id] = value;
    }
    if (derived.occupation !== "unknown" && next.occupation === "unknown") next.occupation = derived.occupation;
  }
  return next;
}

export function profileFromAnswers(base: IntakeProfile, answers: Answer[]): IntakeProfile {
  let profile = mergeProfile(base, {});
  for (const answer of answers) profile = applyAnswerToProfile(profile, answer);
  return profile;
}

export function answersFromProfile(profile: IntakeProfile): Answer[] {
  const answers: Answer[] = [];
  if (profile.openingText) {
    answers.push({
      questionId: "opening",
      dimension: "family",
      field: "openingText",
      value: "free_text",
      freeText: profile.openingText,
      skipped: false,
    });
  }
  for (const [questionId, value] of Object.entries(profile.fields)) {
    const question = getQuestionById(questionId);
    if (!question) continue;
    answers.push({
      questionId,
      dimension: question.dimension,
      field: question.field,
      value,
      skipped: false,
    });
  }
  return answers;
}

/** 把 profile 已知的字段合并进答案，保证报告/指数能用到客户在开场里说过的信息。 */
export function mergeProfileAnswers(profile: IntakeProfile | null | undefined, answers: Answer[]): Answer[] {
  if (!profile) return answers;
  const merged = new Map<string, Answer>();
  for (const answer of answersFromProfile(profile)) merged.set(answer.questionId, answer);
  for (const answer of answers) merged.set(answer.questionId, answer);
  return Array.from(merged.values());
}

function known(profile: IntakeProfile, id: string, answered: Set<string>): boolean {
  if (answered.has(id)) return true;
  return Boolean(profile.fields[id]);
}

/** 按客户实际情况决定必问清单：普通职工不问企业，没孩子不问教育。 */
export function requiredQuestionIds(profile: IntakeProfile, answers: Answer[]): string[] {
  const answered = new Set(answers.map((answer) => answer.questionId));
  const ids: string[] = [];

  for (const id of [...BASE_FAMILY_IDS, ...BASE_PROTECTION_IDS]) {
    if (!known(profile, id, answered)) ids.push(id);
  }

  const business = ["self", "family", "passive"].includes(profile.fields.family_business ?? "");
  const children = profile.fields.family_children;
  const marital = profile.fields.marriage_status;
  const concerns = new Set(profile.concerns);

  const branch: string[] = [];
  if (business) branch.push("business_guarantee", "business_debt", "business_succession");
  if (children === "married") branch.push("inheritance_children_marriage", "inheritance_tools", "inheritance_when", "inheritance_control");
  if (children === "school" || children === "working") branch.push("education_stage", "education_plan", "education_budget");
  if (marital === "remarried" || marital === "divorced") branch.push("marriage_assets", "marriage_spouse_debt");
  if (concerns.has("retirement") || profile.occupation === "retired") branch.push("retirement_age", "retirement_income", "retirement_cashflow");
  if (concerns.has("health")) branch.push("health_conditions", "health_history");
  if (concerns.has("inheritance")) branch.push("inheritance_intent", "inheritance_tools", "inheritance_worry");
  if (concerns.has("education")) branch.push("education_stage", "education_plan", "education_budget");
  if (concerns.has("business")) branch.push("business_guarantee", "business_debt", "business_succession");

  for (const id of branch) {
    if (!known(profile, id, answered) && !ids.includes(id)) ids.push(id);
  }

  for (const id of CORE_FINANCIAL_IDS) {
    if (!known(profile, id, answered) && !ids.includes(id)) ids.push(id);
  }

  return ids;
}

export function selectProfileNextQuestion(profile: IntakeProfile, answers: Answer[]): Question | null {
  const answered = new Set(answers.map((answer) => answer.questionId));
  for (const id of requiredQuestionIds(profile, answers)) {
    if (answered.has(id)) continue;
    const question = getQuestionById(id);
    if (question) return question;
  }
  return null;
}

function labelOf(id: string, value: string): string {
  const question = getQuestionById(id);
  const option = question?.options.find((item) => item.value === value);
  return option?.label ?? value;
}

export function buildIntakeSummary(
  profile: IntakeProfile,
  answers: Answer[],
): { sections: Array<{ title: string; body: string }>; missing: string[] } {
  const merged = mergeProfileAnswers(profile, answers);
  const field = (id: string) => {
    const answer = merged.find((item) => item.questionId === id);
    return answer && !answer.skipped ? answer.value : null;
  };
  const sections: Array<{ title: string; body: string }> = [];

  const occupationLabel: Record<Occupation, string> = {
    employee: "普通职工/上班族",
    business_owner: "企业主/经营者",
    family_business: "家人经营企业",
    retired: "已退休",
    other: "其他",
    unknown: "本次未明确",
  };
  const house = [
    field("family_members") ? `常住：${labelOf("family_members", field("family_members")!)}` : "",
    field("family_children") ? `子女：${labelOf("family_children", field("family_children")!)}` : "",
    field("marriage_status") ? `婚姻：${labelOf("marriage_status", field("marriage_status")!)}` : "",
    field("family_parents") ? `父母：${labelOf("family_parents", field("family_parents")!)}` : "",
    field("family_siblings") ? `兄弟姐妹：${labelOf("family_siblings", field("family_siblings")!)}` : "",
  ].filter(Boolean);
  sections.push({
    title: "家庭与身份",
    body: [`职业：${occupationLabel[profile.occupation]}`, ...house].join("；") || "本次还未提供足够信息。",
  });

  if (profile.concerns.length) {
    sections.push({
      title: "你最担心的方向",
      body: profile.concerns.map((key) => CONCERN_LABELS[key]).join("、"),
    });
  }

  const protection = [
    field("protection_medical") ? `医疗：${labelOf("protection_medical", field("protection_medical")!)}` : "",
    field("protection_critical") ? `重疾：${labelOf("protection_critical", field("protection_critical")!)}` : "",
    field("protection_life") ? `寿险/意外：${labelOf("protection_life", field("protection_life")!)}` : "",
    field("protection_policy_roles") ? `保单角色：${labelOf("protection_policy_roles", field("protection_policy_roles")!)}` : "",
  ].filter(Boolean);
  if (protection.length) sections.push({ title: "已有保障", body: protection.join("；") });

  const money = [
    field("cashflow_income_range") ? `年收入：${labelOf("cashflow_income_range", field("cashflow_income_range")!)}` : "",
    field("cashflow_expense_range") ? `年支出：${labelOf("cashflow_expense_range", field("cashflow_expense_range")!)}` : "",
    field("assets_liquid") ? `流动资产：${labelOf("assets_liquid", field("assets_liquid")!)}` : "",
    field("assets_fixed") ? `固定资产：${labelOf("assets_fixed", field("assets_fixed")!)}` : "",
    field("assets_debt") ? `负债：${labelOf("assets_debt", field("assets_debt")!)}` : "",
  ].filter(Boolean);
  if (money.length) sections.push({ title: "财务概览", body: money.join("；") });

  const missing = requiredQuestionIds(profile, answers)
    .map((id) => getQuestionById(id)?.prompt)
    .filter((prompt): prompt is string => Boolean(prompt))
    .slice(0, 5);
  return { sections, missing };
}
