import type { KYCFormData, PreMeetingGoal, PreMeetingPrepData, PreMeetingPurpose } from "@/types";

export const PRE_MEETING_PURPOSE_LABELS: Record<PreMeetingPurpose, string> = {
  first_meeting: "初次面谈",
  second_meeting: "二次见面",
  policy_review: "保单检视",
  referral: "转介绍客户",
  existing_customer_addon: "老客户加保",
  other: "其他",
};

export const PRE_MEETING_GOAL_LABELS: Record<PreMeetingGoal, string> = {
  build_trust: "建立信任",
  discover_needs: "了解需求",
  book_next_meeting: "约下次",
  policy_review: "做保单检视",
  solution_discussion: "进入方案沟通",
};

export function normalizePreMeetingPrepData(input: unknown): PreMeetingPrepData {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<PreMeetingPrepData>;
  const meetingPurpose: PreMeetingPurpose =
    raw.meetingPurpose && raw.meetingPurpose in PRE_MEETING_PURPOSE_LABELS
      ? raw.meetingPurpose
      : "first_meeting";
  const desiredOutcome: PreMeetingGoal =
    raw.desiredOutcome && raw.desiredOutcome in PRE_MEETING_GOAL_LABELS
      ? raw.desiredOutcome
      : "discover_needs";

  return {
    meetingPurpose,
    meetingBackground: String(raw.meetingBackground || "").trim(),
    knownCustomerInfo: String(raw.knownCustomerInfo || "").trim(),
    worryPoint: String(raw.worryPoint || "").trim(),
    desiredOutcome,
  };
}

export function validatePreMeetingPrepData(data: PreMeetingPrepData): string | null {
  if (!data.meetingBackground) return "请填写本次见面背景";
  if (data.meetingBackground.length > 800) return "本次见面背景请控制在 800 字以内";
  if ((data.knownCustomerInfo || "").length > 800) return "已知客户背景请控制在 800 字以内";
  if ((data.worryPoint || "").length > 500) return "担心的问题请控制在 500 字以内";
  return null;
}

export function buildPreMeetingPrepQuestion(data: PreMeetingPrepData): string {
  return `# 见前准备

## 这次见面目的
${PRE_MEETING_PURPOSE_LABELS[data.meetingPurpose]}

## 本次见面背景或触发点
${data.meetingBackground}

## 已知客户背景
${data.knownCustomerInfo || "未填写"}

## 我最担心的问题
${data.worryPoint || "未填写"}

## 希望这次达成什么
${PRE_MEETING_GOAL_LABELS[data.desiredOutcome || "discover_needs"]}

请生成一张面谈作战卡，并严格按以下五段输出：
1. 客户初步判断
2. 这次别急着做什么
3. 开场切入话题
4. 提问顺序
5. 可能异议预案`;
}

export function buildPreMeetingPrepConversationTitle(
  data: PreMeetingPrepData,
  kycData: Partial<KYCFormData> | Record<string, unknown> | null | undefined,
): string {
  const name = typeof kycData?.clientName === "string" ? kycData.clientName.trim() : "";
  const purpose = PRE_MEETING_PURPOSE_LABELS[data.meetingPurpose];
  return name ? `见前准备：${name}/${purpose}` : `见前准备：${purpose}`;
}

export function buildPreMeetingPrepModeInstructions(): string {
  return `# 见前准备模式

你正在处理的是代理人见客户前 2 到 5 分钟查看的面谈作战卡，不是长篇策略报告，也不是线下面谈现场实时逐句陪聊。

输出必须短、自然、可执行，并严格使用以下五段标题：

## 1. 客户初步判断
基于客户档案和本次补充背景，给出 2-3 条最重要判断。对不确定的内容必须写成“可能”，不要编造客户没有提供的信息。

## 2. 这次别急着做什么
用短句提醒代理人避免过早讲产品、收益、价格、方案，避免先问敏感财务数字，避免把普通聊天强行转成推销。

## 3. 开场切入话题
给 2-3 个自然开场，像真人见面前准备的话，不要培训腔。先建立关系和理解，再进入保险相关问题。

## 4. 提问顺序
按“先找需求，再强化需求，再找不足，最后才进入方案”的顾问式顺序，写清楚先问什么、再问什么、暂时别问什么。

## 5. 可能异议预案
预判客户可能说“没兴趣、太忙了、我有保险了、我没预算、我先了解一下、收益怎么样”等情况时的下一句接法。每条都要短，不反驳、不催促、不承诺收益。

不要输出产品推荐、投保建议、收益承诺或具体保险方案。`;
}
