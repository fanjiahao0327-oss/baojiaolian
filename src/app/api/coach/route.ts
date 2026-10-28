import { NextRequest, NextResponse } from "next/server";
import {
  buildObjectionConversationTitle,
  buildObjectionFollowupQuestion,
  normalizeObjectionFollowupData,
  validateObjectionFollowupData,
} from "@/lib/objection-followup";
import {
  buildPreMeetingPrepConversationTitle,
  buildPreMeetingPrepQuestion,
  normalizePreMeetingPrepData,
  validatePreMeetingPrepData,
} from "@/lib/pre-meeting-prep";
import {
  buildMeetingReviewConversationTitle,
  buildMeetingReviewQuestion,
  normalizeMeetingReviewData,
  validateMeetingReviewData,
} from "@/lib/meeting-review";
import type { CoachMode, Message } from "@/types";
import { getSession } from "@/lib/auth";
import { consumePoints, getBalance, MIN_BALANCE, calcPoints } from "@/lib/points";
import { getDb, rows, row } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { encrypt, decrypt } from "@/lib/crypto";
import { markdownToRichHTML } from "@/lib/markdown";
import {
  getAIClient,
  thinkingMaxConfig,
  noThinkingConfig,
  formatCostLog,
} from "@/lib/ai-client";
import { buildCoachMessages } from "@/lib/coach-prompt";
import { ensureCoachResponseCompliance } from "@/lib/coach-compliance";

const INJECTION_PATTERNS = [
  /忽略.{0,10}(之前|前面|以上|上述|所有|系统).{0,10}(指令|提示|规则|设定|要求)/,
  /(忘记|无视|跳过|不要管).{0,10}(之前|前面|以上|上述|规则|指令|设定)/,
  /(你|你被).{0,5}(系统|提示词|prompt|指令).{0,10}(是|叫|为|告诉)/,
  /(show|print|output|repeat|display).{0,10}(your|the).{0,10}(system|instruction|prompt|rule)/i,
  /(告诉我|输出|泄露|透露|展示|打印|复制).{0,10}(系统|提示词|prompt|底层|知识库|数据|规则|源码)/,
  /(知识库|数据|资料).{0,5}(来自|来源|出自|哪里|是什么)/,
  /(what|where).{0,10}(knowledge|data|source|database).{0,10}(come from|from|is)/i,
  /(你).{0,5}(怎么|如何).{0,10}(知道|学到|获取|拿到)/,
  /(数据库|database|表|table|字段|field).{0,5}(结构|schema|设计|有哪些)/,
  /(你).{0,3}(接受|收到).{0,5}(什么|哪些).{0,5}(培训|训练|数据|资料)/,
  /(把|将).{0,5}(你|自己).{0,5}(系统|提示词|prompt).{0,5}(翻译|润色|整理|改写|用表格|重新组织)/,
];

function detectInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(input));
}

function detectKycInjection(kycData: Record<string, unknown>): boolean {
  for (const key of Object.keys(kycData)) {
    const val = kycData[key];
    if (typeof val === "string" && detectInjection(val)) return true;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string" && detectInjection(item)) return true;
      }
    }
  }
  return false;
}

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

  const rl = rateLimit(`coach:${userId}`, "coach");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rl.resetIn} 秒后再试` },
      { status: 429 }
    );
  }

  const balance = await getBalance(userId);
  if (balance < MIN_BALANCE) {
    return NextResponse.json({ error: "积分不足，请充值" }, { status: 402 });
  }

  try {
    const body = await request.json();
    const {
      kycData,
      question,
      history,
      clientId,
      conversationId: rawConversationId,
      noStream,
      mode: rawMode,
      objectionFollowup,
      preMeetingPrep,
      meetingReview,
    } = body;

    const mode: CoachMode =
      rawMode === "objection_followup"
        ? "objection_followup"
        : rawMode === "pre_meeting_prep"
          ? "pre_meeting_prep"
          : rawMode === "meeting_review"
            ? "meeting_review"
          : "diagnosis";
    const rawObjection = objectionFollowup as Record<string, unknown> | null | undefined;
    const hasObjectionPayload =
      mode === "objection_followup" &&
      !!rawObjection &&
      typeof rawObjection === "object" &&
      String(rawObjection.customerWords || "").trim().length > 0;
    const objectionData = hasObjectionPayload
      ? normalizeObjectionFollowupData(objectionFollowup)
      : null;
    const objectionError = objectionData ? validateObjectionFollowupData(objectionData) : null;
    if (objectionError) {
      return NextResponse.json({ error: objectionError }, { status: 400 });
    }
    if (mode === "objection_followup" && !hasObjectionPayload && !(rawConversationId && Number(rawConversationId) > 0)) {
      return NextResponse.json({ error: "请填写客户原话" }, { status: 400 });
    }
    const rawPrep = preMeetingPrep as Record<string, unknown> | null | undefined;
    const hasPreMeetingPrepPayload =
      mode === "pre_meeting_prep" &&
      !!rawPrep &&
      typeof rawPrep === "object" &&
      String(rawPrep.meetingBackground || "").trim().length > 0;
    const preMeetingPrepData = hasPreMeetingPrepPayload
      ? normalizePreMeetingPrepData(preMeetingPrep)
      : null;
    const preMeetingPrepError = preMeetingPrepData ? validatePreMeetingPrepData(preMeetingPrepData) : null;
    if (preMeetingPrepError) {
      return NextResponse.json({ error: preMeetingPrepError }, { status: 400 });
    }
    if (mode === "pre_meeting_prep" && !hasPreMeetingPrepPayload && !(rawConversationId && Number(rawConversationId) > 0)) {
      return NextResponse.json({ error: "请填写本次见面背景" }, { status: 400 });
    }
    const rawMeetingReview = meetingReview as Record<string, unknown> | null | undefined;
    const hasMeetingReviewPayload =
      mode === "meeting_review" &&
      !!rawMeetingReview &&
      typeof rawMeetingReview === "object" &&
      String(rawMeetingReview.recap || "").trim().length > 0;
    const meetingReviewData = hasMeetingReviewPayload
      ? normalizeMeetingReviewData(meetingReview)
      : null;
    const meetingReviewError = meetingReviewData ? validateMeetingReviewData(meetingReviewData) : null;
    if (meetingReviewError) {
      return NextResponse.json({ error: meetingReviewError }, { status: 400 });
    }
    if (mode === "meeting_review" && !hasMeetingReviewPayload && !(rawConversationId && Number(rawConversationId) > 0)) {
      return NextResponse.json({ error: "请填写面谈过程复盘" }, { status: 400 });
    }

    const userInput = mode === "objection_followup" && objectionData
      ? buildObjectionFollowupQuestion(objectionData)
      : mode === "pre_meeting_prep" && preMeetingPrepData
        ? buildPreMeetingPrepQuestion(preMeetingPrepData)
        : mode === "meeting_review" && meetingReviewData
          ? buildMeetingReviewQuestion(meetingReviewData)
      : String(question || "");
    const frontendKyc: Record<string, unknown> = (kycData as Record<string, unknown>) || {};
    const isFollowUp = history && Array.isArray(history) && history.length > 0;
    const requestedConversationId =
      rawConversationId && Number(rawConversationId) > 0 ? Number(rawConversationId) : null;

    const objectionFields = objectionData
      ? [objectionData.customerWords, objectionData.agentReply || "", objectionData.customerBackground || ""]
      : [];
    const preMeetingPrepFields = preMeetingPrepData
      ? [
          preMeetingPrepData.meetingBackground,
          preMeetingPrepData.knownCustomerInfo || "",
          preMeetingPrepData.worryPoint || "",
        ]
      : [];
    const meetingReviewFields = meetingReviewData
      ? [
          meetingReviewData.recap,
          meetingReviewData.customerQuotes || "",
          meetingReviewData.agentResponse || "",
        ]
      : [];
    if (
      detectInjection(userInput) ||
      detectKycInjection(frontendKyc) ||
      objectionFields.some((field) => detectInjection(field)) ||
      preMeetingPrepFields.some((field) => detectInjection(field)) ||
      meetingReviewFields.some((field) => detectInjection(field))
    ) {
      return NextResponse.json(
        { error: "抱歉，无法处理此问题。如需帮助请联系作者。" },
        { status: 400 }
      );
    }
    let safeKycData: Record<string, unknown> = {};
    const sql = getDb();

    if (isFollowUp && !requestedConversationId) {
      return NextResponse.json({ error: "缺少对话ID，请重新打开对话后再追问" }, { status: 400 });
    }

    // --- 解析 clientId / conversationId ---
    let resolvedClientId: number | null = (clientId && Number(clientId) > 0) ? Number(clientId) : null;
    let conversationId: number | null = null;
    let existingConversationMessages: Message[] | null = null;

    if (requestedConversationId) {
      const convRows = await sql`
        SELECT id, client_id, messages
        FROM conversations
        WHERE id = ${requestedConversationId} AND user_id = ${userId}
      `;
      const conv = rows<{ id: number; client_id: number | null; messages: string }>(convRows)[0];
      if (!conv) {
        return NextResponse.json({ error: "对话不存在" }, { status: 404 });
      }
      conversationId = conv.id;
      existingConversationMessages = JSON.parse(conv.messages || "[]");
      if (resolvedClientId && conv.client_id && resolvedClientId !== conv.client_id) {
        return NextResponse.json({ error: "客户与对话不匹配" }, { status: 400 });
      }
      if (!resolvedClientId && conv.client_id) {
        resolvedClientId = conv.client_id;
      }
    }

    if (!resolvedClientId) {
      safeKycData = { ...frontendKyc };
      if (mode === "diagnosis") {
        // --- 完全新客户：用前端数据创建 ---
        const r = await sql`INSERT INTO clients (user_id, name, kyc_snapshot)
          VALUES (${userId}, ${generateClientName(frontendKyc)}, ${encrypt(JSON.stringify(frontendKyc))})
          RETURNING id`;
        resolvedClientId = Number(row<{ id: number }>(r).id);
      }
    } else {
      // --- 已有客户：DB 是唯一数据源，不从前端覆盖 ---
      const clientRows = await sql`SELECT kyc_snapshot FROM clients WHERE id = ${resolvedClientId} AND user_id = ${userId}`;
      const clientRow = rows<{ kyc_snapshot: string }>(clientRows)[0];
      if (!clientRow) {
        return NextResponse.json({ error: "客户不存在" }, { status: 404 });
      }
      if (clientRow) {
        try {
          safeKycData = JSON.parse(decrypt(clientRow.kyc_snapshot));
        } catch { /* 解密失败 */ }
      }
      // 只有首次提交时才把前端表单数据写回 DB（首次提交 frontendKyc 是权威的）
      const isFirstSubmit = !history || (Array.isArray(history) && history.length === 0);
      if (mode === "diagnosis" && isFirstSubmit && Object.keys(frontendKyc).length > 0) {
        safeKycData = { ...safeKycData, ...frontendKyc };
        await sql`UPDATE clients SET kyc_snapshot = ${encrypt(JSON.stringify(safeKycData))}, updated_at = NOW() WHERE id = ${resolvedClientId} AND user_id = ${userId}`;
      }
    }

    const effectiveQuestion = userInput;
    const conversationTitle = mode === "objection_followup" && objectionData
      ? buildObjectionConversationTitle(objectionData)
      : mode === "pre_meeting_prep" && preMeetingPrepData
        ? buildPreMeetingPrepConversationTitle(preMeetingPrepData, safeKycData)
        : mode === "meeting_review" && meetingReviewData
          ? buildMeetingReviewConversationTitle(meetingReviewData, safeKycData)
      : generateClientName(safeKycData);

    // 处理对话记录
    if (!requestedConversationId) {
      const userMsg: Message = { role: "user", content: effectiveQuestion, timestamp: Date.now() };
      const result = await sql`INSERT INTO conversations (user_id, client_id, title, messages) VALUES (${userId}, ${resolvedClientId}, ${conversationTitle}, ${JSON.stringify([userMsg])}) RETURNING id`;
      conversationId = Number(row<{ id: number }>(result).id);
    } else {
      const msgs: Message[] = [...(existingConversationMessages || [])];
      msgs.push({ role: "user", content: effectiveQuestion, timestamp: Date.now() });
      await sql`UPDATE conversations SET messages = ${JSON.stringify(msgs)}, updated_at = NOW() WHERE id = ${conversationId} AND user_id = ${userId}`;
      if (resolvedClientId) {
        await sql`UPDATE conversations SET client_id = ${resolvedClientId} WHERE id = ${conversationId} AND user_id = ${userId} AND client_id IS NULL`;
      }
    }

    if (!conversationId) {
      return NextResponse.json({ error: "对话创建失败" }, { status: 500 });
    }

    const promptHistory = existingConversationMessages || (Array.isArray(history) ? history : []);
    const safePromptHistory: Array<{ role: "user" | "coach"; content: string }> = [];
    if (promptHistory.length > 0) {
      for (const msg of promptHistory) {
        if (msg.role === "user") {
          if (detectInjection(String(msg.content || ""))) {
            return NextResponse.json(
              { error: "抱歉，无法处理此问题。如需帮助请联系作者。" },
              { status: 400 }
            );
          }
          safePromptHistory.push({ role: "user", content: msg.content });
        } else if (msg.role === "coach") {
          safePromptHistory.push({ role: "coach", content: msg.content });
        }
      }
    }

    const { messages, moduleIds } = buildCoachMessages({
      mode,
      question: effectiveQuestion,
      kycData: safeKycData,
      history: safePromptHistory,
      isFollowUp: Boolean(isFollowUp),
    });
    console.log(`[coach] modules=${moduleIds.join(",")} isFollowUp=${Boolean(isFollowUp)}`);

    const {
      kycData: _k,
      question: _q,
      history: _h,
      clientId: _c,
      conversationId: _cid,
      noStream: _ns,
      mode: _m,
      objectionFollowup: _of,
      preMeetingPrep: _prep,
      meetingReview: _meetingReview,
      ...restBody
    } = body;
    const isJsonl = (restBody as Record<string, unknown>).format === "jsonl";

    if (noStream && !isJsonl) {
      const completion = await getAIClient().chat.completions.create({
        ...thinkingMaxConfig({ userId }),
        messages: messages,
        stream: false,
      });

      const initialResponse = completion.choices[0]?.message?.content || "";
      const usage = completion.usage;
      let promptTokens = usage?.prompt_tokens || 0;
      let completionTokens = usage?.completion_tokens || 0;
      let cacheHit =
        (usage as unknown as Record<string, unknown> | undefined)
          ?.prompt_cache_hit_tokens as number | undefined;
      let cacheMiss =
        (usage as unknown as Record<string, unknown> | undefined)
          ?.prompt_cache_miss_tokens as number | undefined;

      const complianceResult = await ensureCoachResponseCompliance(
        initialResponse,
        async (rewritePrompt) => {
          try {
            const rewriteCompletion = await getAIClient().chat.completions.create({
              ...noThinkingConfig({ userId }),
              max_tokens: 8192,
              messages: [
                ...messages,
                { role: "assistant", content: initialResponse },
                { role: "user", content: rewritePrompt },
              ],
              stream: false,
            });
            const rewriteUsage = rewriteCompletion.usage;
            promptTokens += rewriteUsage?.prompt_tokens || 0;
            completionTokens += rewriteUsage?.completion_tokens || 0;
            cacheHit =
              (cacheHit || 0) +
              Number(
                (rewriteUsage as unknown as Record<string, unknown> | undefined)
                  ?.prompt_cache_hit_tokens || 0,
              );
            cacheMiss =
              (cacheMiss || 0) +
              Number(
                (rewriteUsage as unknown as Record<string, unknown> | undefined)
                  ?.prompt_cache_miss_tokens || 0,
              );
            return rewriteCompletion.choices[0]?.message?.content || "";
          } catch (error) {
            console.error("[coach] compliance rewrite failed:", error);
            return "";
          }
        },
      );
      const fullResponse = complianceResult.content;
      if (complianceResult.rewritten) {
        console.warn(
          `[coach] compliance rewrite risks=${complianceResult.risks
            .map((risk) => risk.code)
            .join(",")}`,
        );
      }

      // 保存对话（存原始 markdown，方便追问历史）
      const resultRows = await sql`SELECT messages FROM conversations WHERE id = ${conversationId}`;
      const conversationRow = rows<{ messages: string }>(resultRows)[0];
      const msgs: Message[] = JSON.parse(conversationRow.messages);
      msgs.push({ role: "coach", content: fullResponse, timestamp: Date.now() });
      await sql`UPDATE conversations SET messages = ${JSON.stringify(msgs)}, total_input_tokens = total_input_tokens + ${promptTokens}, total_output_tokens = total_output_tokens + ${completionTokens}, updated_at = NOW() WHERE id = ${conversationId}`;
      const consumed = calcPoints(promptTokens, completionTokens);
      const deduct = await consumePoints(
        userId,
        consumed,
        '对话消耗 ' + promptTokens + '/' + completionTokens + ' tokens'
      );

      console.log(formatCostLog(conversationId, {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        prompt_cache_hit_tokens: cacheHit,
        prompt_cache_miss_tokens: cacheMiss,
      }, deduct));

      const strippedMarkdown = fullResponse.replace(/\n*\[SUGGESTED_QUESTIONS\][\s\S]*$/i, "");
      const richHTML = markdownToRichHTML(strippedMarkdown);

      return NextResponse.json({
        content: richHTML,
        conversationId,
        promptTokens,
        completionTokens,
        pointCost: deduct,
      });
    }

    // 流式模式（Web 端原始文本 / 小程序 JSONL）
    const stream = await getAIClient().chat.completions.create({
      ...thinkingMaxConfig({ userId }),
      messages: messages,
      stream: true,
      stream_options: { include_usage: true },
    });

    const encoder = new TextEncoder();
    let fullResponse = "";
    let usage: {
      prompt_tokens: number; completion_tokens: number;
      prompt_cache_hit_tokens?: number; prompt_cache_miss_tokens?: number;
    } | null = null;

    const streamable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.usage) {
              const u = chunk.usage as unknown as Record<string, unknown>;
              usage = {
                prompt_tokens: (u.prompt_tokens as number) || 0,
                completion_tokens: (u.completion_tokens as number) || 0,
                prompt_cache_hit_tokens: u.prompt_cache_hit_tokens as number | undefined,
                prompt_cache_miss_tokens: u.prompt_cache_miss_tokens as number | undefined,
              };
            }
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              if (isJsonl) {
                controller.enqueue(encoder.encode(JSON.stringify({ type: "text", c: content }) + "\n"));
              } else {
                controller.enqueue(encoder.encode(content));
              }
            }
          }

          const resultRows = await sql`SELECT messages FROM conversations WHERE id = ${conversationId}`;
          const conversationRow = rows<{ messages: string }>(resultRows)[0];
          const msgs: Message[] = JSON.parse(conversationRow.messages);
          msgs.push({ role: "coach", content: fullResponse, timestamp: Date.now() });
          let deduct = 0;
          if (usage) {
            await sql`UPDATE conversations SET messages = ${JSON.stringify(msgs)}, total_input_tokens = total_input_tokens + ${usage.prompt_tokens}, total_output_tokens = total_output_tokens + ${usage.completion_tokens}, updated_at = NOW() WHERE id = ${conversationId}`;
            const consumed = calcPoints(usage.prompt_tokens, usage.completion_tokens);
            deduct = await consumePoints(
              userId,
              consumed,
              '对话消耗 ' + usage.prompt_tokens + '/' + usage.completion_tokens + ' tokens'
            );
            console.log(formatCostLog(conversationId, usage, deduct));
          } else {
            await sql`UPDATE conversations SET messages = ${JSON.stringify(msgs)}, updated_at = NOW() WHERE id = ${conversationId}`;
          }

          if (isJsonl) {
            // 先截断原始 markdown 中的 [SUGGESTED_QUESTIONS]，再转 HTML
            const strippedMarkdown = fullResponse.replace(/\n*\[SUGGESTED_QUESTIONS\][\s\S]*$/i, "");
            const richHTML = markdownToRichHTML(strippedMarkdown);
            controller.enqueue(encoder.encode(JSON.stringify({ type: "done", cid: conversationId, html: richHTML, pointCost: deduct }) + "\n"));
          }
        } catch (error) {
          console.error("[coach] stream error:", error);
          if (isJsonl) {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "error", msg: "抱歉，AI 服务暂时不可用" }) + "\n"));
          } else {
            controller.enqueue(encoder.encode("抱歉，AI 服务暂时不可用，未消耗积分，请稍后重试。"));
          }
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
        "X-Conversation-Id": String(conversationId),
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
