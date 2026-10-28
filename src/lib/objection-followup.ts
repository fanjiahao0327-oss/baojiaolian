import type { ObjectionFollowupData, ObjectionFollowupGoal, ObjectionFollowupScenario } from "@/types";
import { OBJECTION_GOAL_LABELS, OBJECTION_SCENARIO_LABELS } from "@/lib/objection-followup-options";

export { OBJECTION_GOAL_LABELS, OBJECTION_SCENARIO_LABELS };

export function normalizeObjectionFollowupData(input: unknown): ObjectionFollowupData {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<ObjectionFollowupData>;
  const scenario: ObjectionFollowupScenario =
    raw.scenario && raw.scenario in OBJECTION_SCENARIO_LABELS ? raw.scenario : "after_meeting";
  const nextGoal: ObjectionFollowupGoal =
    raw.nextGoal && raw.nextGoal in OBJECTION_GOAL_LABELS ? raw.nextGoal : "wechat";

  return {
    customerWords: String(raw.customerWords || "").trim(),
    scenario,
    agentReply: String(raw.agentReply || "").trim(),
    customerBackground: String(raw.customerBackground || "").trim(),
    nextGoal,
  };
}

export function validateObjectionFollowupData(data: ObjectionFollowupData): string | null {
  if (!data.customerWords) return "请填写客户原话";
  if (data.customerWords.length > 800) return "客户原话请控制在 800 字以内";
  if ((data.agentReply || "").length > 800) return "我的回应请控制在 800 字以内";
  if ((data.customerBackground || "").length > 800) return "客户背景请控制在 800 字以内";
  return null;
}

export function buildObjectionFollowupQuestion(data: ObjectionFollowupData): string {
  return `# 客户卡点跟进

## 客户原话
${data.customerWords}

## 当时场景
${OBJECTION_SCENARIO_LABELS[data.scenario]}

## 代理人当时回应
${data.agentReply || "未填写"}

## 客户背景
${data.customerBackground || "未填写"}

## 下一步目标
${OBJECTION_GOAL_LABELS[data.nextGoal]}

请按以下五段输出：
1. 客户真实卡点
2. 现在先别做什么
3. 下一次跟进怎么说
4. 客户继续拖延时怎么接
5. 教练拆解`;
}

export function buildObjectionConversationTitle(data: ObjectionFollowupData): string {
  const shortWords = data.customerWords.replace(/\s+/g, " ").slice(0, 24);
  return `客户卡点跟进：${shortWords || OBJECTION_SCENARIO_LABELS[data.scenario]}`;
}

export function buildObjectionModeInstructions(): string {
  return `# 客户卡点跟进模式

你正在处理的是面谈后或跟进前的客户卡点复盘，不是线下面谈现场实时救场。

输出必须严格使用以下五段标题：

## 1. 客户真实卡点
判断表面异议背后的真实卡点。允许给出 1-2 个可能性，但要说明最可能的一种。

## 2. 现在先别做什么
明确指出代理人下一步不要做的事情，例如不要继续堆产品利益、不要催单、不要反驳客户感受、不要在需求没确认前进入报价。

## 3. 下一次跟进怎么说
根据下一步目标给出短、自然、能直接用于微信/电话/下次见面的表达。不要像培训课，不要编造客户没有提供的信息。

## 4. 客户继续拖延时怎么接
给第二轮温和接法，继续保持顾问姿态。

## 5. 教练拆解
用简短语言解释本次判断背后的顾问式逻辑，指出代理人回应里可能走偏的地方，并给出下次优先提问方向。

不要输出产品推荐、投保建议、收益承诺或具体保险方案。`;
}
