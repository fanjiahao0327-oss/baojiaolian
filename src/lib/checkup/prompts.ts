import type { Answer, CheckupReport, Question, RiskItem, WealthIndexScore } from "./types";

export function buildPhrasePrompt(question: Question, context: string): string {
  return `你是家庭风险测评的提问助手。请把下面的问题改写成一句自然、口语、不带压迫感的中文问题，只输出这一句。

原始问题：${question.prompt}
客户上下文：${context || "无"}
要求：
- 一次只问一个问题
- 允许客户说「不想说 / 说不清 / 跳过」
- 不推销、不承诺、不制造焦虑
- 不出现产品名、公司名、费率、收益`;
}

export function buildReportSystemPrompt(): string {
  return `你是「AI家庭风险测评」的报告生成器。你的任务是把客户自述的信息整理成一份家庭风险自查报告，不是销售方案。

## 报告结构
1. 家庭画像
2. 家庭财富平衡 5 大指数：安全指数、流动指数、自由指数、独立指数、传承指数
3. Top 5 风险：现象 / 为什么重要 / 不处理的后果 / 建议动作
4. 90 天行动清单
5. 家庭风险预算区间
6. 下一步
7. 免责声明

## 合规边界
- 不推荐具体产品、公司、投保链接
- 不点名产品，不出现产品名、费率、现价、收益演示
- 不得承诺收益、不得承诺理赔、不得预判核保
- 不贬低同业、不制造焦虑
- 法律内容只讲规则，标注「不构成法律意见」
- 报告由 AI 辅助生成，不构成投保建议

## 写作要求
- 中文、克制、具体
- 每条风险必须写「不处理的后果」
- 数据不足的指数写「信息不足」，不要编造
- 最后必须附固定免责声明`;
}

export function buildReportUserPrompt(input: {
  profile: string;
  indices: WealthIndexScore[];
  risks: RiskItem[];
  answers: Answer[];
}): string {
  return `## 客户画像
${input.profile}

## 家庭财富平衡 5 大指数
${JSON.stringify(input.indices, null, 2)}

## 规则识别出的风险
${JSON.stringify(input.risks, null, 2)}

## 客户回答
${JSON.stringify(input.answers, null, 2)}

请输出 JSON，字段与设计文档的 CheckupReport 一致；不要输出 markdown 代码围栏。`;
}

export function buildReportFallback(): CheckupReport {
  return {
    profile: { familyStructure: "信息不足", lifeStage: "信息不足", summary: "本次信息不足，建议线下补充。" },
    wealthIndices: [],
    topRisks: [],
    actionPlan: [],
    budgetRange: { min: null, max: null, basis: "信息不足", disclaimer: "预算参考，非保费报价，非产品推荐" },
    nextStep: "建议预约一次一对一诊断，补充家庭结构与资产信息。",
    disclaimer: "本报告由 AI 辅助生成，仅供风险自查参考，不构成保险产品推荐、投保建议或法律意见。",
  };
}
