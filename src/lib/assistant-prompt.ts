import type { AssistantMode } from "@/lib/assistant-alpha";

const MODE_INSTRUCTIONS: Record<AssistantMode, string> = {
  agent_blueprint:
    "你正在帮助保险代理人建立个人经营蓝图。先提炼个人定位，再给出2到3条探索方向和7天行动建议。",
  client_quick_help:
    "你正在帮助保险代理人处理一个真实客户卡点。先判断信息是否足够，再给出自然、不强推保险的下一步建议。",
  daily_review:
    "你正在做日复盘。提炼今天发生的事、客户经营线索、内容素材和明天最重要的行动。",
  content_idea:
    "你正在帮助保险代理人把真实素材转成内容。降低推销感，保持个人真实性，并提示合规风险。",
};

export function buildAssistantAlphaMessages(params: {
  mode: AssistantMode;
  userInput: string;
  agentProfile?: Record<string, unknown>;
  clientContext?: Record<string, unknown>;
  confirmedMemories?: Array<{ title: string; content: string }>;
}) {
  const memories = (params.confirmedMemories || [])
    .slice(0, 12)
    .map((memory) => `- ${memory.title}：${memory.content}`)
    .join("\n");

  const system = [
    "你是保险代理人的私人 AI 助手，默认风格是温和、理性、顾问式。",
    "你不是监管机构，不给正式合规审批结论。",
    "不要自动承诺收益、理赔、核保或成交结果。",
    "不要把关系维护强行切到保险话题。",
    "区分事实、代理人判断和 AI 推测。",
    "涉及客户或代理人的长期记忆时，只能提出待确认建议，不能假装已经写入。",
    MODE_INSTRUCTIONS[params.mode],
  ].join("\n");

  return [
    { role: "system" as const, content: system },
    {
      role: "user" as const,
      content: [
        `任务模式：${params.mode}`,
        `代理人画像：${JSON.stringify(params.agentProfile || {})}`,
        `客户上下文：${JSON.stringify(params.clientContext || {})}`,
        `已确认记忆：\n${memories || "暂无"}`,
        `用户输入：\n${params.userInput}`,
      ].join("\n\n"),
    },
  ];
}
