import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { selectModules } from "@/lib/knowledge";
import type { KYCFormData, Message } from "@/types";
import { getSession } from "@/lib/auth";
import { getBalance, COST_PER_CALL } from "@/lib/points";
import { getDb } from "@/lib/db";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

function generateClientName(kycData: Record<string, unknown> | null | undefined): string {
  if (!kycData) return "未命名客户";
  const name = (kycData.clientName as string)?.trim();
  if (name) return name;
  const age = kycData.age ? `${kycData.age}岁` : "";
  const gender = kycData.gender === "male" ? "男" : kycData.gender === "female" ? "女" : "";
  const city = (kycData.city as string) || "";
  const parts = [age, gender, city ? `-${city}` : ""].filter(Boolean);
  return parts.join("") || "未命名客户";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.userId;

  const balance = getBalance(userId);
  if (balance < COST_PER_CALL) {
    return NextResponse.json({ error: "积分不足，请充值" }, { status: 402 });
  }

  try {
    const body = await request.json();
    const { kycData, question, history, clientId } = body;
    const safeKycData = kycData || {};

    const db = getDb();

    // 处理客户关联
    let resolvedClientId = clientId || null;
    if (!resolvedClientId) {
      const result = db
        .prepare("INSERT INTO clients (user_id, name, kyc_snapshot) VALUES (?, ?, ?)")
        .run(userId, generateClientName(safeKycData), JSON.stringify(safeKycData));
      resolvedClientId = Number(result.lastInsertRowid);
    } else {
      db.prepare("UPDATE clients SET kyc_snapshot = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
        .run(JSON.stringify(safeKycData), resolvedClientId, userId);
    }

    // 处理对话记录
    let conversationId: number;
    const isNewConversation = kycData && Array.isArray(history) && history.length === 0;

    if (isNewConversation) {
      const userMsg: Message = { role: "user", content: question, timestamp: Date.now() };
      const result = db
        .prepare("INSERT INTO conversations (user_id, client_id, title, messages) VALUES (?, ?, ?, ?)")
        .run(userId, resolvedClientId, generateClientName(safeKycData), JSON.stringify([userMsg]));
      conversationId = Number(result.lastInsertRowid);
    } else {
      const latest = db
        .prepare("SELECT id, messages FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
        .get(userId) as { id: number; messages: string } | undefined;

      if (!latest) {
        const userMsg: Message = { role: "user", content: question, timestamp: Date.now() };
        const result = db
          .prepare("INSERT INTO conversations (user_id, client_id, title, messages) VALUES (?, ?, ?, ?)")
          .run(userId, resolvedClientId, "追问", JSON.stringify([userMsg]));
        conversationId = Number(result.lastInsertRowid);
      } else {
        conversationId = latest.id;
        const msgs: Message[] = JSON.parse(latest.messages);
        msgs.push({ role: "user", content: question, timestamp: Date.now() });
        db.prepare("UPDATE conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?").run(
          JSON.stringify(msgs),
          conversationId
        );
        db.prepare("UPDATE conversations SET client_id = ? WHERE id = ? AND client_id IS NULL")
          .run(resolvedClientId, conversationId);
      }
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

    // 根据 KYC 数据动态选择相关知识模块
    const modules = selectModules(safeKycData as KYCFormData);
    const moduleContents = modules.map((m) => m.content).join("\n");

    const systemPrompt = `${moduleContents}

# 最后提醒

请在输出末尾，用 [SUGGESTED_QUESTIONS] 标签提供 2-3 个代理人可以继续追问你的建议问题。
`;

    messages.push({ role: "system", content: systemPrompt });

    if (history && Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        if (msg.role === "user") {
          messages.push({ role: "user", content: msg.content });
        } else if (msg.role === "coach") {
          messages.push({ role: "assistant", content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: question });

    const stream = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: messages,
      stream: true,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const streamable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          const txn = db.transaction(() => {
            const row = db
              .prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM point_transactions WHERE user_id = ?")
              .get(userId) as { balance: number };
            if (row.balance < COST_PER_CALL) {
              throw new Error("积分不足");
            }
            db.prepare("INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'consume', ?)").run(
              userId,
              -COST_PER_CALL,
              "对话消耗"
            );
          });
          txn();

          const row = db.prepare("SELECT messages FROM conversations WHERE id = ?").get(conversationId) as { messages: string };
          const msgs: Message[] = JSON.parse(row.messages);
          msgs.push({ role: "coach", content: fullResponse, timestamp: Date.now() });
          db.prepare("UPDATE conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?").run(
            JSON.stringify(msgs),
            conversationId
          );
        } catch (error) {
          console.error("[coach] stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(streamable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[coach] API error:", error);
    return NextResponse.json(
      { error: "处理请求时发生错误" },
      { status: 500 }
    );
  }
}
