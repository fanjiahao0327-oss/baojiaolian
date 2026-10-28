import type {
  KYCFormData,
  MeetingReviewData,
  MeetingReviewNextGoal,
  MeetingReviewResult,
} from "@/types";

export const MEETING_REVIEW_RESULT_LABELS: Record<MeetingReviewResult, string> = {
  interested: "有兴趣",
  hesitant: "犹豫",
  rejected: "明确拒绝",
  booked_next: "约了下次",
  family_discussion: "需要家人商量",
  info_missing: "信息不足",
};

export const MEETING_REVIEW_NEXT_GOAL_LABELS: Record<MeetingReviewNextGoal, string> = {
  wechat: "发微信",
  call: "打电话",
  next_meeting: "约下次见面",
  send_material: "补充资料",
  pause: "暂缓观察",
};

export function normalizeMeetingReviewData(input: unknown): MeetingReviewData {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<MeetingReviewData>;
  const meetingResult: MeetingReviewResult =
    raw.meetingResult && raw.meetingResult in MEETING_REVIEW_RESULT_LABELS
      ? raw.meetingResult
      : "info_missing";
  const nextGoal: MeetingReviewNextGoal =
    raw.nextGoal && raw.nextGoal in MEETING_REVIEW_NEXT_GOAL_LABELS
      ? raw.nextGoal
      : "wechat";

  return {
    recap: String(raw.recap || "").trim(),
    meetingResult,
    customerQuotes: String(raw.customerQuotes || "").trim(),
    agentResponse: String(raw.agentResponse || "").trim(),
    nextGoal,
  };
}

export function validateMeetingReviewData(data: MeetingReviewData): string | null {
  if (!data.recap) return "请填写面谈过程复盘";
  if (data.recap.length > 1600) return "面谈过程复盘请控制在 1600 字以内";
  if ((data.customerQuotes || "").length > 800) return "客户关键原话请控制在 800 字以内";
  if ((data.agentResponse || "").length > 800) return "我的回应请控制在 800 字以内";
  return null;
}

export function buildMeetingReviewQuestion(data: MeetingReviewData): string {
  return `# 面谈复盘

## 面谈过程复盘
${data.recap}

## 面谈结果
${MEETING_REVIEW_RESULT_LABELS[data.meetingResult || "info_missing"]}

## 客户关键原话
${data.customerQuotes || "未填写"}

## 我的回应
${data.agentResponse || "未填写"}

## 下一步目标
${MEETING_REVIEW_NEXT_GOAL_LABELS[data.nextGoal || "wechat"]}

请严格按以下五段输出：
1. 本次面谈结论
2. 下一步跟进计划
3. 下一次怎么说
4. 本次哪里走偏了
5. 建议补充到客户档案`;
}

export function buildMeetingReviewConversationTitle(
  data: MeetingReviewData,
  kycData: Partial<KYCFormData> | Record<string, unknown> | null | undefined,
): string {
  const name = typeof kycData?.clientName === "string" ? kycData.clientName.trim() : "";
  const result = MEETING_REVIEW_RESULT_LABELS[data.meetingResult || "info_missing"];
  return name ? `面谈复盘：${name}/${result}` : `面谈复盘：${result}`;
}

export function buildMeetingReviewModeInstructions(): string {
  return `# 面谈复盘模式

你正在处理的是代理人面谈结束后的会后复盘，不是见面前准备，也不是线下面谈现场实时逐句接话。

输出必须先给行动计划，再给教练纠偏，并严格使用以下五段标题：

## 1. 本次面谈结论
判断客户当前大概率处于哪个顾问式面谈阶段，以及客户真实意向。不要编造客户没有提供的信息；不确定内容必须写成“可能”。

## 2. 下一步跟进计划
给出什么时候跟、用什么方式跟、这次跟进目标是什么、先补哪类信息。计划要简短、具体、能行动，不催促客户马上决定。

## 3. 下一次怎么说
根据下一步目标输出可直接用于微信、电话或下次见面的自然话术。不反驳客户、不承诺收益、不替客户做决定。

## 4. 本次哪里走偏了
指出代理人是否太早讲产品/收益/价格，是否没有问透需求，是否跳过关系和信任，是否没有处理家庭决策人，是否催急或解释过多。表达要直接但不打击人。

## 5. 建议补充到客户档案
只列建议补充项，不自动写入。每项按“字段、依据、类型”表达，类型只能是“事实”或“待确认”。不要输出 [KYC_UPDATE] 标签。

不要输出产品推荐、投保建议、收益承诺或具体保险方案。`;
}
