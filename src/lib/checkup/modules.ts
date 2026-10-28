import { getQuestionById } from "./question-bank";
import type { Answer, Question } from "./types";
import type { IntakeProfile } from "./profile";

export type ModuleId =
  | "medical"
  | "retirement"
  | "inheritance"
  | "marriage"
  | "business"
  | "education"
  | "family"
  | "financial";

export interface ModuleQuestionMeta {
  questionId: string;
  source: string;
  purpose: string;
  hiddenRisk?: boolean;
  openOnly?: boolean;
}

export interface CheckupModule {
  id: ModuleId;
  title: string;
  intro: string;
  source: string;
  questions: ModuleQuestionMeta[];
}

export const CHECKUP_MODULES: Record<ModuleId, CheckupModule> = {
  medical: {
    id: "medical",
    title: "医疗与健康",
    intro: "先把你对医疗的真实担心、就医路径和已有保障弄清楚，不急着讲产品。",
    source: "中高端医疗险需求分析六步（T021）；健康险 KYC-KYP-KMS（T029）",
    questions: [
      { questionId: "medical_priority", source: "中高端医疗六步·第一步", purpose: "找到医疗需求的主观动机", hiddenRisk: true, openOnly: true },
      { questionId: "medical_hospital", source: "中高端医疗六步·第二步", purpose: "还原当前就医路径和想保留的医院/地域选择", hiddenRisk: true, openOnly: true },
      { questionId: "protection_medical", source: "一丁 KYC·已有保障；中高端医疗六步·第三步", purpose: "盘点已有医疗安排" },
      { questionId: "protection_critical", source: "健康险 KYC·已有保障", purpose: "判断重疾保障缺口" },
      { questionId: "health_conditions", source: "健康险 KYC·把脉", purpose: "了解与当前问题直接相关的体况线索" },
      { questionId: "protection_runway", source: "守富与传家·安全指数", purpose: "判断收入中断时家庭能撑多久" },
    ],
  },
  retirement: {
    id: "retirement",
    title: "退休与养老",
    intro: "养老不是一笔钱，是四笔钱：生存、品质、保障、传承。先看哪一笔最薄。",
    source: "北京家庭养老四笔钱专场（R159/R160）；养老现金池与现金流",
    questions: [
      { questionId: "retirement_age", source: "养老四笔钱·第一笔", purpose: "明确停止工作和领养老金的时间" },
      { questionId: "retirement_four_money", source: "养老四笔钱框架", purpose: "定位最薄的一笔钱", hiddenRisk: true },
      { questionId: "retirement_care", source: "养老四笔钱·第三笔", purpose: "挖失能照护的隐性风险", hiddenRisk: true, openOnly: true },
      { questionId: "retirement_income", source: "养老四笔钱·第一笔", purpose: "判断退休后的主要来源" },
      { questionId: "cashflow_passive", source: "养老现金池与现金流", purpose: "判断被动收入对退休支出的覆盖" },
    ],
  },
  inheritance: {
    id: "inheritance",
    title: "传承与继承",
    intro: "先问给谁、谁管、怎么给，再谈工具；顺序不能反。",
    source: "《家庭财富传承确权三问三闸》V1.1；15 题体检·传承意愿落地；苏颖时间轴提问",
    questions: [
      { questionId: "inheritance_intent", source: "确权三问·给谁", purpose: "判断传承意愿是否已经落地" },
      { questionId: "inheritance_children_marriage", source: "15 题体检·婚姻与传承；66 问·婚姻", purpose: "判断孩子婚姻对给钱安排的影响" },
      { questionId: "inheritance_tools", source: "确权三问·怎么给", purpose: "盘点现有遗嘱/信托/受益人安排" },
      { questionId: "inheritance_when", source: "确权三问·给钱时点", purpose: "明确一次性/结婚/35 岁/分批", hiddenRisk: true, openOnly: true },
      { questionId: "inheritance_control", source: "确权三问·谁管", purpose: "明确给出去之后谁说了算", hiddenRisk: true, openOnly: true },
      { questionId: "inheritance_worry", source: "66 问·传承；15 题体检·资产交底", purpose: "识别客户最担心的传承后果" },
    ],
  },
  marriage: {
    id: "marriage",
    title: "婚姻与财产",
    intro: "只看与当前家庭结构有关的婚前/婚内边界、配偶债务和子女安排。",
    source: "66 节保险法商课 PART1 婚姻（1–15 节）；15 题体检·婚姻与家业隔离；民法典 1062/1063/1064",
    questions: [
      { questionId: "marriage_status", source: "一丁 KYC·家庭婚姻", purpose: "判断初婚/再婚/离异对财产安排的影响" },
      { questionId: "marriage_assets", source: "66 问·婚姻；民法典 1062/1063", purpose: "判断婚前/婚内财产边界" },
      { questionId: "marriage_spouse_debt", source: "民法典 1064；66 问·债务", purpose: "识别配偶债务对家庭资产的隐性影响", hiddenRisk: true },
    ],
  },
  business: {
    id: "business",
    title: "家企与债务",
    intro: "先看个人担保、家企混同和接班，不把企业风险直接推成保险方案。",
    source: "王勇家庭结构图（T031）；15 题体检·婚姻与家业隔离、接班与二代；家企四级（R387）",
    questions: [
      { questionId: "business_guarantee", source: "15 题体检·家业隔离；王勇深度 KYC·企业", purpose: "识别个人/家庭资产担保", hiddenRisk: true },
      { questionId: "business_debt", source: "王勇深度 KYC·企业情况", purpose: "判断企业负债是否可能穿透家庭" },
      { questionId: "business_succession", source: "15 题体检·接班与二代", purpose: "识别接班/出售/职业经理人安排", openOnly: true },
    ],
  },
  education: {
    id: "education",
    title: "子女教育",
    intro: "只谈孩子教育的时间表、目标和准备方式，不把教育和养老混在一起。",
    source: "苏颖四步成交·储蓄险/教育金（P077–P113）；子女养育-教育金边界",
    questions: [
      { questionId: "education_stage", source: "苏颖教育金场景·时间轴", purpose: "确定教育用钱的时间点" },
      { questionId: "education_plan", source: "苏颖教育金场景·目标", purpose: "判断国内/留学和大额教育计划", openOnly: true },
      { questionId: "education_budget", source: "子女养育-教育金边界", purpose: "判断教育金准备缺口", hiddenRisk: true },
    ],
  },
  family: {
    id: "family",
    title: "家庭档案 KYC",
    intro: "最后补你没提到的家庭、职业和保障底稿；已经说过的直接跳过。",
    source: "一丁统一 KYC 九宫格（T004）；王勇家庭结构图只在复杂家庭/家企时追加",
    questions: [
      { questionId: "family_members", source: "一丁 KYC·家庭婚姻", purpose: "家庭结构底稿" },
      { questionId: "family_children", source: "一丁 KYC·家庭婚姻", purpose: "子女结构与婚否" },
      { questionId: "family_parents", source: "一丁 KYC·家庭婚姻", purpose: "父母赡养/照护责任" },
      { questionId: "family_siblings", source: "王勇家庭结构图·兄弟姐妹；民法典 1127/1128", purpose: "判断父母遗产流向和代位继承" },
      { questionId: "family_business", source: "一丁 KYC·工作与收支", purpose: "判断是否家企交织" },
      { questionId: "protection_medical", source: "一丁 KYC·已有保障", purpose: "补齐医疗底稿" },
      { questionId: "protection_critical", source: "一丁 KYC·已有保障", purpose: "补齐重疾底稿" },
    ],
  },
  financial: {
    id: "financial",
    title: "财务底稿",
    intro: "最后用区间补 7 个数字，算 5 维自检；不想说可以跳过，跳过就标信息不足。",
    source: "《守富与传家》第 8 章 5 大指数；养老四笔钱·生存的钱",
    questions: [
      { questionId: "cashflow_income_range", source: "守富与传家·安全指数", purpose: "算安全/独立指数" },
      { questionId: "cashflow_expense_range", source: "守富与传家·安全/自由指数", purpose: "算支出和结余" },
      { questionId: "cashflow_passive", source: "守富与传家·自由指数；养老四笔钱", purpose: "算被动收入覆盖" },
      { questionId: "assets_liquid", source: "守富与传家·流动指数", purpose: "算流动资产占比" },
      { questionId: "assets_fixed", source: "守富与传家·流动/独立指数", purpose: "算总资产分母" },
      { questionId: "assets_debt", source: "守富与传家·安全/独立指数", purpose: "算负债和人生债务" },
      { questionId: "assets_inheritance", source: "守富与传家·传承指数", purpose: "算传承性资产占比" },
    ],
  },
};

export const MODULE_ORDER: ModuleId[] = [
  "medical",
  "retirement",
  "inheritance",
  "marriage",
  "business",
  "education",
  "family",
  "financial",
];

const TOPIC_MODULES: ModuleId[] = ["medical", "retirement", "inheritance", "marriage", "business", "education"];

export function selectModuleIds(profile: IntakeProfile): ModuleId[] {
  const selected = new Set<ModuleId>();
  const concerns = new Set(profile.concerns);
  if (concerns.has("health")) selected.add("medical");
  if (concerns.has("retirement")) selected.add("retirement");
  if (concerns.has("inheritance")) selected.add("inheritance");
  if (concerns.has("marriage")) selected.add("marriage");
  if (concerns.has("business")) selected.add("business");
  if (concerns.has("education")) selected.add("education");

  const fields = profile.fields;
  if (["self", "family"].includes(fields.family_business ?? "")) selected.add("business");
  if (fields.family_children === "married") selected.add("inheritance");
  if (fields.family_children === "school" || fields.family_children === "working") selected.add("education");
  if (fields.marriage_status === "remarried" || fields.marriage_status === "divorced") selected.add("marriage");
  if (fields.inheritance_intent || fields.inheritance_tools) selected.add("inheritance");
  if (["none", "under30"].includes(fields.protection_critical ?? "") || fields.protection_medical === "social_only") {
    selected.add("medical");
  }

  const modules = MODULE_ORDER.filter((id) => id === "family" || id === "financial" || selected.has(id));
  const direction = profile.fields.__direction;
  if (direction && modules.includes(direction as ModuleId) && !["both", "family", "care"].includes(direction)) {
    return [direction as ModuleId, ...modules.filter((id) => id !== direction)];
  }
  return modules;
}

export function topicModuleCount(profile: IntakeProfile): number {
  return selectModuleIds(profile).filter((id) => TOPIC_MODULES.includes(id)).length;
}

export function questionQuota(moduleId: ModuleId, profile: IntakeProfile): number {
  if (moduleId === "family") return 7;
  if (moduleId === "financial") return 7;
  const topicCount = topicModuleCount(profile);
  if (topicCount <= 2) return 4;
  if (topicCount <= 4) return 3;
  return 2;
}

export function buildModulePlan(profile: IntakeProfile): CheckupModule[] {
  return selectModuleIds(profile).map((id) => CHECKUP_MODULES[id]);
}

export interface ModuleQuestionResult {
  question: Question;
  module: CheckupModule;
  moduleIndex: number;
  moduleTotal: number;
  questionIndex: number;
  questionTotal: number;
  moduleFirst: boolean;
}

function isKnown(profile: IntakeProfile, questionId: string, answered: Set<string>): boolean {
  return answered.has(questionId) || Boolean(profile.fields[questionId]);
}

export function nextModuleQuestion(profile: IntakeProfile, answers: Answer[]): ModuleQuestionResult | null {
  const plan = buildModulePlan(profile);
  const answered = new Set(answers.map((answer) => answer.questionId));

  for (let moduleIndex = 0; moduleIndex < plan.length; moduleIndex += 1) {
    const module = plan[moduleIndex];
    const quota = questionQuota(module.id, profile);
    const knownInModule = module.questions.filter((meta) => isKnown(profile, meta.questionId, answered)).length;
    if (knownInModule >= quota) continue;

    let questionIndex = 0;
    for (const meta of module.questions) {
      if (isKnown(profile, meta.questionId, answered)) continue;
      const base = getQuestionById(meta.questionId);
      if (!base) continue;
      questionIndex += 1;
      if (questionIndex > quota) break;
      const question: Question = {
        ...base,
        module: module.id,
        source: meta.source,
        purpose: meta.purpose,
        hiddenRisk: meta.hiddenRisk,
        openOnly: meta.openOnly,
      };
      return {
        question,
        module,
        moduleIndex: moduleIndex + 1,
        moduleTotal: plan.length,
        questionIndex: knownInModule + questionIndex,
        questionTotal: Math.min(quota, module.questions.length),
        moduleFirst: !module.questions.some((meta) => answered.has(meta.questionId)),
      };
    }
  }
  return null;
}

export function moduleForQuestion(questionId: string): ModuleId | null {
  for (const module of Object.values(CHECKUP_MODULES)) {
    if (module.questions.some((meta) => meta.questionId === questionId)) return module.id;
  }
  return null;
}

function valueOf(answers: Answer[], id: string): string | null {
  const answer = answers.find((item) => item.questionId === id);
  if (!answer || answer.skipped) return null;
  if (answer.value === "free_text" && answer.freeText) return answer.freeText;
  return answer.value;
}

function labelOf(id: string): string {
  const question = getQuestionById(id);
  return question?.options[0]?.label ? "" : "";
}

function optionLabel(id: string, value: string | null): string {
  if (!value) return "本次未提供";
  const question = getQuestionById(id);
  return question?.options.find((option) => option.value === value)?.label ?? value;
}

function remark(id: string, value: string | null): string {
  if (!value) return "本次未提供";
  return optionLabel(id, value);
}

/** 每个模块结束时的复述；同时点出 1 个“我联想到”的隐性风险，等客户纠正。 */
export function buildModuleSummary(moduleId: ModuleId, profile: IntakeProfile, answers: Answer[]): string {
  const v = (id: string) => valueOf(answers, id) ?? profile.fields[id] ?? null;
  if (moduleId === "medical") {
    return `医疗这块我理解的是：最在意${remark("medical_priority", v("medical_priority"))}，平时就医走${remark("medical_hospital", v("medical_hospital"))}，目前医疗安排是${remark("protection_medical", v("protection_medical"))}，重疾是${remark("protection_critical", v("protection_critical"))}。我联想到的隐性风险是：真正住院时，收入中断和自费药可能比治疗费本身更影响家庭；这个情况你存在吗？`;
  }
  if (moduleId === "retirement") {
    return `养老这块我理解的是：希望${remark("retirement_age", v("retirement_age"))}退休，四笔钱里最薄的是${remark("retirement_four_money", v("retirement_four_money"))}，失能照护安排是${remark("retirement_care", v("retirement_care"))}，被动收入${remark("cashflow_passive", v("cashflow_passive"))}。我联想到的隐性风险是：高龄照护那几年可能比刚退休更花钱；这个你算过吗？`;
  }
  if (moduleId === "inheritance") {
    return `传承这块我理解的是：目前${remark("inheritance_intent", v("inheritance_intent"))}，孩子婚姻安排是${remark("inheritance_children_marriage", v("inheritance_children_marriage"))}，工具是${remark("inheritance_tools", v("inheritance_tools"))}。我联想到的隐性风险是：如果受益人写的是“法定”或孩子婚变，钱可能不是按你的意愿到人；这个情况存在吗？`;
  }
  if (moduleId === "marriage") {
    return `婚姻这块我理解的是：目前${remark("marriage_status", v("marriage_status"))}，财产约定是${remark("marriage_assets", v("marriage_assets"))}，配偶债务是${remark("marriage_spouse_debt", v("marriage_spouse_debt"))}。我联想到的隐性风险是：婚内取得的生存金/现金价值可能被认定为共同财产；这个边界你清楚吗？`;
  }
  if (moduleId === "business") {
    return `企业这块我理解的是：个人担保是${remark("business_guarantee", v("business_guarantee"))}，企业负债是${remark("business_debt", v("business_debt"))}，接班安排是${remark("business_succession", v("business_succession"))}。我联想到的隐性风险是：企业债务可能穿透到家庭资产；这条边界你确认过吗？`;
  }
  if (moduleId === "education") {
    return `教育这块我理解的是：孩子处于${remark("education_stage", v("education_stage"))}，计划是${remark("education_plan", v("education_plan"))}，教育金准备是${remark("education_budget", v("education_budget"))}。我联想到的隐性风险是：教育支出有明确时间点，如果和养老钱混在一起，容易被临时挪用；这个你们分开了吗？`;
  }
  if (moduleId === "family") {
    return `家庭档案我理解的是：${remark("family_members", v("family_members"))}，孩子${remark("family_children", v("family_children"))}，父母${remark("family_parents", v("family_parents"))}，兄弟姐妹${remark("family_siblings", v("family_siblings"))}。还有没有我没问到的家庭成员或责任？`;
  }
  return `财务底稿我记下了：年收入${remark("cashflow_income_range", v("cashflow_income_range"))}，年支出${remark("cashflow_expense_range", v("cashflow_expense_range"))}，流动资产${remark("assets_liquid", v("assets_liquid"))}，固定资产${remark("assets_fixed", v("assets_fixed"))}，负债${remark("assets_debt", v("assets_debt"))}。这些只用于算自检分，不用于产品报价。`;
}

export function buildModuleOutline(profile: IntakeProfile): Array<{ id: ModuleId; title: string }> {
  return buildModulePlan(profile).map((module) => ({ id: module.id, title: module.title }));
}
