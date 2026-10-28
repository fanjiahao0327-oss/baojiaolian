import type { CheckupDimensionId, Question } from "./types";

function q(
  id: string,
  dimension: CheckupDimensionId,
  field: string,
  prompt: string,
  options: Array<[string, string]>,
  required = false,
  weight = 1,
): Question {
  return {
    id,
    dimension,
    field,
    prompt,
    options: options.map(([value, label]) => ({ value, label })),
    allowFreeText: true,
    required,
    weight,
  };
}

export const QUESTION_BANK: Question[] = [
  // 家庭结构（必问，4 题）
  q("family_members", "family", "household", "家里现在常住的是哪几口人？", [
    ["couple", "夫妻两人"], ["children", "夫妻 + 孩子"], ["three_gen", "三代同堂"], ["other", "其他"],
  ], true, 3),
  q("family_children", "family", "children", "孩子多大了、结婚了吗？", [
    ["school", "还在上学"], ["working", "已工作未婚"], ["married", "已结婚"], ["none", "还没有孩子"],
  ], true, 3),
  q("family_parents", "family", "parents", "父母那边需要你们照顾吗？", [
    ["healthy", "身体健康，不需要"], ["financial", "需要经济支持"], ["care", "需要日常照护"], ["other", "其他"],
  ], true, 2),
  q("family_siblings", "family", "siblings", "你有兄弟姐妹吗？父母将来的安排，你们聊过吗？", [
    ["only_child", "独生子女"], ["harmony", "有兄弟姐妹，关系正常"], ["conflict", "有兄弟姐妹，有分歧"], ["skip", "不想说"],
  ], true, 3),
  q("family_business", "family", "businessInvolvement", "家里有人做生意或持股吗？", [
    ["none", "没有"], ["self", "有，本人经营"], ["family", "有，配偶或子女经营"], ["passive", "有，但未参与经营"],
  ], true, 2),

  // 已有保障（必问，4 题）
  q("protection_medical", "protection", "medicalInsurance", "现在有商业医疗险吗？", [
    ["million", "有，百万医疗"], ["mid_high", "有，中高端医疗"], ["social_only", "只有社保"], ["unknown", "不清楚"],
  ], true, 3),
  q("protection_critical", "protection", "criticalIllness", "有重疾险吗？保额大概多少？", [
    ["none", "没有"], ["under30", "30 万以下"], ["30_50", "30–50 万"], ["over50", "50 万以上"], ["unknown", "不清楚"],
  ], true, 3),
  q("protection_life", "protection", "lifeInsurance", "家庭主要收入的人有寿险或意外险吗？", [
    ["both", "都有"], ["accident_only", "只有意外"], ["life_only", "只有寿险"], ["none", "都没有"], ["unknown", "不清楚"],
  ], true, 2),
  q("protection_runway", "protection", "emergencyRunway", "如果明天收入中断，家里能撑多久？", [
    ["under3", "3 个月以内"], ["3_6", "3–6 个月"], ["6_12", "6–12 个月"], ["over12", "1 年以上"], ["unknown", "说不清"],
  ], true, 3),

  // 传承（4 题）
  q("inheritance_intent", "inheritance", "inheritanceIntent", "家里的钱将来怎么给到孩子，认真想过吗？", [
    ["documented", "已经写进文件"], ["oral", "口头跟家人说过"], ["thought", "想过，但没安排"], ["never", "还没想过"], ["young", "孩子还小"],
  ], false, 3),
  q("inheritance_children_marriage", "inheritance", "childrenMarriage", "孩子结婚时，你希望这笔钱是婚前给还是婚后给？", [
    ["before", "婚前给"], ["after", "婚后给"], ["depends", "看情况"], ["never", "没想过"],
  ], false, 2),
  q("inheritance_tools", "inheritance", "inheritanceTools", "现在有用遗嘱、信托或保单受益人做安排吗？", [
    ["will", "有遗嘱"], ["trust", "有信托 / 保险金信托"], ["beneficiary", "保单写了受益人"], ["none", "都没有"], ["unknown", "不清楚"],
  ], false, 3),
  q("inheritance_worry", "inheritance", "inheritanceWorry", "你最担心孩子拿到钱后发生什么？", [
    ["split", "被分走"], ["spend", "被挥霍"], ["manage", "不会管"], ["dispute", "家庭纠纷"], ["none", "没担心"],
  ], false, 2),

  // 收支（4 题，客户提到才问）
  q("cashflow_income_source", "cashflow", "incomeSources", "家里主要收入来源是什么？", [
    ["salary", "工资"], ["business", "经营"], ["investment", "投资 / 房租"], ["mixed", "混合"], ["skip", "不想说"],
  ]),
  q("cashflow_income_range", "cashflow", "annualIncomeRange", "家庭年收入大概在哪个区间？", [
    ["under30", "30 万以下"], ["30_60", "30–60 万"], ["60_100", "60–100 万"], ["over100", "100 万以上"], ["skip", "不想说"],
  ]),
  q("cashflow_expense_range", "cashflow", "annualExpenseRange", "家庭一年固定支出大概在哪个区间？", [
    ["under10", "10 万以下"], ["10_30", "10–30 万"], ["30_50", "30–50 万"], ["over50", "50 万以上"], ["skip", "不想说"],
  ]),
  q("cashflow_passive", "cashflow", "passiveIncomeRange", "现在有房租、股息、年金这类被动收入吗？", [
    ["none", "没有"], ["small", "有一点"], ["partial", "能覆盖部分支出"], ["most", "能覆盖大部分支出"], ["skip", "不想说"],
  ]),

  // 资产与负债（2 题）
  q("assets_liquid", "assets", "liquidAssetsRange", "家里能快速变现的钱大概多少？", [
    ["under50", "50 万以下"], ["50_100", "50–100 万"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ]),
  q("assets_debt", "assets", "totalDebtRange", "房贷、经营贷、担保大概多少？", [
    ["none", "没有"], ["under100", "100 万以下"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ]),

  // 健康（2 题）
  q("health_conditions", "health", "preExistingConditions", "家里人有体检异常或既往症吗？", [
    ["none", "没有"], ["controlled", "有，已控制"], ["treating", "有，正在治疗"], ["skip", "不想说"],
  ]),
  q("health_history", "health", "familyHistory", "家族里有重大疾病史吗？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ]),

  // 教育（2 题）
  q("education_stage", "education", "childrenEducationStage", "孩子现在处于什么教育阶段？", [
    ["preschool", "学龄前"], ["primary", "小学"], ["middle", "中学"], ["college", "大学 / 留学"], ["worked", "已工作"],
  ]),
  q("education_plan", "education", "studyAbroadPlan", "有留学或大额教育计划吗？", [
    ["none", "没有"], ["domestic", "有，国内"], ["abroad", "有，留学"], ["undecided", "还没想"],
  ]),

  // 养老（2 题）
  q("retirement_age", "retirement", "retirementAge", "你希望多大退休？", [
    ["before50", "50 岁前"], ["50_55", "50–55 岁"], ["55_60", "55–60 岁"], ["after60", "60 岁以后"], ["never", "没想过"],
  ]),
  q("retirement_income", "retirement", "retirementPlan", "退休后主要靠什么？", [
    ["social", "社保"], ["savings", "储蓄 / 理财"], ["passive", "房租 / 年金"], ["children", "子女"], ["never", "没想过"],
  ]),

  // 企业（2 题）
  q("business_ownership", "business", "businessOwnership", "家里有企业经营或股权吗？", [
    ["none", "没有"], ["self", "有，本人经营"], ["family", "有，家人经营"], ["passive", "有，但未参与"],
  ]),
  q("business_guarantee", "business", "guarantees", "企业借钱时，有没有用个人或家庭资产做担保？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["no_business", "没有企业"],
  ]),

  // 婚姻（2 题）
  q("marriage_status", "marriage", "maritalStatus", "现在的婚姻状态？", [
    ["first", "初婚"], ["remarried", "再婚"], ["divorced", "离异"], ["widowed", "丧偶"], ["skip", "不想说"],
  ]),
  q("marriage_assets", "marriage", "preMaritalAssets", "婚前 / 婚内财产有书面约定吗？", [
    ["yes", "有"], ["no", "没有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ]),
];

export function getQuestionById(id: string): Question | undefined {
  return QUESTION_BANK.find((question) => question.id === id);
}

export function getQuestionsForDimension(dimension: CheckupDimensionId): Question[] {
  return QUESTION_BANK.filter((question) => question.dimension === dimension);
}
