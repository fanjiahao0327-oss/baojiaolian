import { NextRequest, NextResponse } from "next/server";
import type { AssistantMode } from "@/lib/assistant-alpha";
import {
  buildAssistantActivationTask,
  selectConfirmedMemoriesForAssistant,
} from "@/lib/assistant-alpha";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import {
  createTask,
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

function normalizeClientId(clientContext: unknown): number | null {
  if (!clientContext || typeof clientContext !== "object") return null;
  const id = Number((clientContext as { id?: unknown }).id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
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
  const activeClientId = normalizeClientId(body.clientContext);

  const [profile, memories] = await Promise.all([
    getAgentProfile(session.userId),
    listMemories(session.userId),
  ]);

  const confirmedMemories = selectConfirmedMemoriesForAssistant(memories, activeClientId)
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

  const taskDraft = buildAssistantActivationTask(mode, activeClientId);
  let taskId: number | null = null;
  if (taskDraft) {
    try {
      taskId = await createTask({
        userId: session.userId,
        clientId: taskDraft.clientId,
        title: taskDraft.title,
        taskType: taskDraft.taskType,
        priority: taskDraft.priority,
        sourceType: "assistant_alpha",
        sourceId: mode,
        payload: {
          mode,
          userInputPreview: userInput.slice(0, 300),
          responsePreview: compliance.content.slice(0, 500),
        },
      });
    } catch {
      taskId = null;
    }
  }

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
  if (taskDraft) {
    await recordProductEvent({
      userId: session.userId,
      eventName: "first_value_candidate",
      eventPath: "/assistant",
      metadata: {
        mode,
        clientId: activeClientId,
        taskId,
        savedTask: Boolean(taskId),
      },
    });
  }

  return NextResponse.json({
    content: compliance.content,
    mode,
    rewritten: compliance.rewritten,
    taskId,
  });
}
