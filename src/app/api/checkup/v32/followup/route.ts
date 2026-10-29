import { NextRequest, NextResponse } from "next/server";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { rateLimit } from "@/lib/rate-limit";
import { buildV32Summary, getFollowupCandidates, type V32Answer } from "@/lib/checkup/v32";

const BANNED = ["风险", "缺口", "不足", "隐患", "裸奔", "漏洞", "危机", "必须", "马上", "赶紧", "否则", "来不及", "千万要", "一定要"];

function normalizeAnswers(raw: unknown): V32Answer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is V32Answer => Boolean(item && typeof item === "object"))
    .map((item) => ({
      questionId: String(item.questionId || "").slice(0, 60),
      title: String(item.title || "").slice(0, 80),
      prompt: String(item.prompt || "").slice(0, 600),
      answer: String(item.answer || "").slice(0, 3000),
    }))
    .filter((item) => item.questionId.length > 0);
}

function normalizeQuestion(text: string): string | null {
  const question = text.replace(/\s+/g, " ").trim();
  if (!question || question.length < 6 || question.length > 120) return null;
  if (/[ABCD][.．、]/.test(question)) return null;
  if (BANNED.some((word) => question.includes(word))) return null;
  return question;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:v32-followup:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const answers = normalizeAnswers(body.answers);
  const stage = Number(body.stage || 1);
  const candidates = getFollowupCandidates(answers).filter((candidate) => {
    return !answers.some((answer) => answer.questionId === `v32_followup_${candidate.id}`);
  });
  const candidate = candidates[0];
  if (!candidate) return NextResponse.json({ done: true, summary: buildV32Summary(answers) });

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ done: false, question: { id: `v32_followup_${candidate.id}`, prompt: candidate.fallback, guidance: "不用组织语言，想到哪说到哪；不想说可以跳过。", source: candidate.source, purpose: candidate.intent } });
  }

  try {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `你是家庭风险测评顾问。请只根据客户前面的回答，生成一个开放式追问，只输出 JSON：{"question":"..."}。意图：${candidate.intent}。要求：只问一个问题；不要给选项；不要下结论；不要推销；不超过 80 个中文字；不要出现产品名、公司名、收益承诺；不要出现禁词：${BANNED.join("、")}。`,
        },
        { role: "user", content: answers.map((answer) => `${answer.title}：${answer.answer}`).join("\n").slice(0, 6000) },
      ],
      response_format: { type: "json_object" },
    } as never);
    const content = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content) as { question?: string };
    const question = normalizeQuestion(String(parsed.question || ""));
    return NextResponse.json({
      done: false,
      question: {
        id: `v32_followup_${candidate.id}`,
        prompt: question || candidate.fallback,
        guidance: "不用组织语言，想到哪说到哪；不想说可以跳过。",
        source: candidate.source,
        purpose: candidate.intent,
      },
    });
  } catch {
    return NextResponse.json({ done: false, question: { id: `v32_followup_${candidate.id}`, prompt: candidate.fallback, guidance: "不用组织语言，想到哪说到哪；不想说可以跳过。", source: candidate.source, purpose: candidate.intent } });
  }
}
