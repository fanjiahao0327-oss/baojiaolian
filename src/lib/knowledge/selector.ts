import type { CoachMode, KYCFormData } from "@/types";
import type { KnowledgeModule, KnowledgeTopic } from "./types";
import { CORE_MODULES, REFERENCE_MODULES } from "./core";
import { METHOD_MODULES } from "./methods";
import { CRITICAL_ILLNESS_MODULES } from "./products-critical-illness";
import { SAVINGS_DIVIDEND_MODULES } from "./products-savings-dividend";
import { OBJECTION_MODULES } from "./objections";
import { CASE_MODULES } from "./cases";

const MAX_REFERENCE_MODULES = 4;

function textIncludes(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function detectKnowledgeTopics(
  kycData: KYCFormData | null | undefined,
  userInput = "",
): Set<KnowledgeTopic> {
  const d = (kycData || {}) as KYCFormData;
  const text = [
    userInput,
    d.triggerScenario,
    d.clientOriginalWords,
    d.clientObjection,
    d.agentResponse,
    d.pastInteraction,
    d.protectionInsurance,
    d.savingsInsurance,
    d.otherInsurance,
    d.insuranceAttitude,
    d.childrenDetail,
    d.parentsDetail,
    d.majorExpensePlan,
    d.fixedAssets,
    d.investmentStyle,
    d.riskTolerance,
  ].filter(Boolean).join(" ");
  const topics = new Set<KnowledgeTopic>();

  if (textIncludes(text, ["重疾", "大病", "身体", "康复", "康养", "核保", "保额", "保费倒挂"])) {
    topics.add("critical_illness");
  }
  if (textIncludes(text, ["医疗险", "百万医疗", "补充医疗", "DRG", "特需", "国际部", "外购药"])) {
    topics.add("medical");
  }
  if (textIncludes(text, ["储蓄", "年金", "现金流", "长期规划", "存不下来"])) {
    topics.add("savings");
  }
  if (textIncludes(text, ["分红", "红利", "收益", "利率", "预定利率", "开门红"])) {
    topics.add("dividend");
  }
  if (textIncludes(text, ["教育", "留学", "国际学校", "小升初", "孩子"])) {
    topics.add("education");
  }
  if (textIncludes(text, ["养老", "退休", "旅居", "养老社区", "护理"])) {
    topics.add("retirement");
  }
  if (textIncludes(text, ["传承", "婚姻", "债务", "留钱", "子女"])) {
    topics.add("inheritance");
  }
  if (textIncludes(text, ["考虑", "家人商量", "太贵", "没钱", "没预算", "交不上", "不划算", "比较"])) {
    topics.add("objection");
  }

  if (d.clientObjection && d.clientObjection.trim()) topics.add("objection");
  if (d.childrenDetail || d.majorExpensePlan) topics.add("education");
  if (d.parentsDetail) topics.add("retirement");
  if (d.savingsInsurance || d.investmentAmount || d.liquidAssets || d.fixedAssets) topics.add("savings");

  return topics;
}

function modeScore(module: KnowledgeModule, mode: CoachMode): number {
  return module.modes.includes("all") || module.modes.includes(mode) ? 2 : 0;
}

function topicScore(module: KnowledgeModule, topics: Set<KnowledgeTopic>): number {
  return module.topics.reduce((score, topic) => score + (topics.has(topic) ? 5 : 0), 0);
}

function selectReferenceModules(
  kycData: KYCFormData | null | undefined,
  mode: CoachMode,
  userInput = "",
): KnowledgeModule[] {
  const topics = detectKnowledgeTopics(kycData, userInput);
  const modules = [
    ...REFERENCE_MODULES,
    ...CRITICAL_ILLNESS_MODULES,
    ...SAVINGS_DIVIDEND_MODULES,
    ...OBJECTION_MODULES,
    ...CASE_MODULES,
  ];
  const scored = modules
    .map((module) => ({
      module,
      score: modeScore(module, mode) + topicScore(module, topics),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_REFERENCE_MODULES).map((entry) => entry.module);
}

export function selectModules(
  kycData: KYCFormData | null | undefined,
  mode: CoachMode = "diagnosis",
  userInput = "",
): KnowledgeModule[] {
  return [...CORE_MODULES, ...METHOD_MODULES, ...selectReferenceModules(kycData, mode, userInput)];
}

export function selectModulesForFollowUp(
  kycData?: KYCFormData | null,
  mode: CoachMode = "diagnosis",
  userInput = "",
): KnowledgeModule[] {
  return [...CORE_MODULES, ...selectReferenceModules(kycData, mode, userInput).slice(0, 2)];
}
