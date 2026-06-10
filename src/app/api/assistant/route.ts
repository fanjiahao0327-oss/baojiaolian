import { NextRequest, NextResponse } from "next/server";
import type { AssistantMode } from "@/lib/assistant-alpha";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import {
  getAgentProfile,
  listMemories,
  recordProductEvent,
} from "@/lib/assistant-data";
import { buildAssistantAlphaMessages } from "@/lib/assistant-prompt";
import { getSession } from "@/lib/auth";
import { ensureCoachResponseCompliance } from "@/lib/coach-compliance";

function normalizeMode(value: unknown): AssistantMode {
  if (
    value === "agent_blueprint" ||
    value === "client_quick_help" ||
    value === "daily_review" ||
    value === "content_idea"
  ) {
    return value;
  }
  return "client_quick_help";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const mode = normalizeMode(body.mode);
  const userInput = String(body.userInput || "").trim();
  if (!userInput) {
    return NextResponse.json({ error: "请先输入要处理的内容" }, { status: 400 });
  }

  const [profile, memories] = await Promise.all([
    getAgentProfile(session.userId),
    listMemories(session.userId),
  ]);

  const confirmedMemories = memories
    .filter((memory) => memory.status === "confirmed")
    .map((memory) => ({ title: memory.title, content: memory.content }));

  const messages = buildAssistantAlphaMessages({
    mode,
    userInput,
    agentProfile: profile?.profileSnapshot || {},
    clientContext: body.clientContext || {},
    confirmedMemories,
  });

  const completion = await getAIClient().chat.completions.create({
    ...noThinkingConfig({ userId: session.userId }),
    messages,
    stream: false,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const compliance = await ensureCoachResponseCompliance(raw, async (rewritePrompt) => {
    const rewrite = await getAIClient().chat.completions.create({
      ...noThinkingConfig({ userId: session.userId }),
      messages: [
        ...messages,
        { role: "assistant", content: raw },
        { role: "user", content: rewritePrompt },
      ],
      stream: false,
    });
    return rewrite.choices[0]?.message?.content || "";
  });

  await recordProductEvent({
    userId: session.userId,
    eventName: "assistant_alpha_run",
    eventPath: "/assistant",
    metadata: {
      mode,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      rewritten: compliance.rewritten,
    },
  });

  return NextResponse.json({
    content: compliance.content,
    mode,
    rewritten: compliance.rewritten,
  });
}
