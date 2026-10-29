import { NextRequest, NextResponse } from "next/server";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { rateLimit } from "@/lib/rate-limit";
import { buildTenSummary, TEN_FIXED_QUESTIONS, type TenAnswer } from "@/lib/checkup/ten-questions";

interface AIFollowup {
  skip?: boolean;
  question?: string;
  reason?: string;
}

function transcript(answers: TenAnswer[]): string {
  return answers
    .map((answer) => `【${answer.title || answer.questionId}】\n${answer.answer}`)
    .join("\n\n")
    .slice(0, 9000);
}

function normalizeAnswers(raw: unknown): TenAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is TenAnswer => Boolean(item && typeof item === "object"))
    .map((item) => ({
      questionId: String(item.questionId || "").slice(0, 50),
      title: String(item.title || "").slice(0, 80),
      prompt: String(item.prompt || "").slice(0, 600),
      answer: String(item.answer || "").slice(0, 3000),
    }))
    .filter((item) => item.questionId.length > 0);
}

function question(step: number, prompt: string, purpose: string) {
  return {
    id: `ai_followup_${step}`,
    prompt,
    guidance: "不用组织语言，想到哪说到哪；不想说可以跳过。",
    source: "苏颖 KYC→UYC“信息联想→待确认”；一丁 KYC 阶段二“一次只解决当前判断”",
    purpose,
    openOnly: true,
    options: [] as Array<{ value: string; label: string }>,
  };
}

function fallbackQuestion(step: number, answers: TenAnswer[]): { done: false; question: ReturnType<typeof question> } | { done: true; summary: ReturnType<typeof buildTenSummary> } {
  const text = answers.map((answer) => answer.answer).join(" ");
  if (step === 1) {
    if (/(企业|公司|经营|股权)/.test(text) && !/(担保|贷款|负债)/.test(text)) {
      return {
        done: false,
        question: question(
          1,
          "你提到家里有企业经营。企业目前有没有贷款、个人担保或对外担保？如果企业出问题，家庭资产有没有一道边界？",
          "补企业负债/个人担保这个最影响判断的缺口",
        ),
      };
    }
    if (/(孩子|儿子|女儿)/.test(text) && /(结婚|已婚|婚)/.test(text) && !/(遗嘱|信托|受益人|给钱|什么时候给)/.test(text)) {
      return {
        done: false,
        question: question(
          1,
          "你提到孩子已经结婚。关于给孩子的钱，你更希望婚前给、婚后给，还是分批给？现在有写受益人/遗嘱或做过安排吗？",
          "补传承时点和现有工具这个缺口",
        ),
      };
    }
    return {
      done: false,
      question: question(
        1,
        "你前面提到的情况里，目前最让你拿不准的是哪一块：家人的健康、退休后的现金流、给孩子的安排，还是企业/债务对家庭的影响？为什么？",
        "补客户自己最在意的判断缺口",
      ),
    };
  }
  if (step === 2) {
    return {
      done: false,
      question: question(
        2,
        "如果只能先处理一件事，你会先补家庭保障、先理传承/受益人、先做企业隔离，还是先补应急金？为什么先选它？",
        "把隐性风险收口成一个优先级和决策",
      ),
    };
  }
  const summary = buildTenSummary(answers);
  if (summary.missing.length > 0) {
    return {
      done: false,
      question: question(
        3,
        `你前面有一块还没说：${summary.missing.slice(0, 2).join("、")}。能补一句吗？`,
        "只补最关键的一个未回答风险域",
      ),
    };
  }
  return { done: true, summary };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:ten:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const answers = normalizeAnswers(body.answers);
  const step = Number(body.stage || 1);
  if (answers.length === 0) return NextResponse.json({ error: "缺少回答" }, { status: 400 });
  if (![1, 2, 3].includes(step)) return NextResponse.json({ error: "无效阶段" }, { status: 400 });

  const fixedAnswered = answers.filter((answer) => TEN_FIXED_QUESTIONS.some((q) => q.id === answer.questionId));
  if (fixedAnswered.length < 8) {
    return NextResponse.json({ error: "请先回答完 8 个固定问题" }, { status: 400 });
  }
  if (answers.some((answer) => answer.questionId === "ai_followup_3")) {
    return NextResponse.json({ done: true, summary: buildTenSummary(answers) });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(fallbackQuestion(step, answers));
  }

  try {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "你是家庭风险测评的顾问。客户刚回答完 8 个固定风险域问题。请基于其原话生成开放式追问，只输出 JSON：{\"skip\":false,\"question\":\"...\",\"reason\":\"...\"} 或 {\"skip\":true}。规则：一次只问一个问题；不要给选项、不要下结论、不要推销；优先补最影响判断的缺口/矛盾，或确认一个隐性风险；30-80 个中文字；不出现产品名、公司名、收益承诺。第 3 步只有在仍存在重大缺口/矛盾时才提问，否则 skip。",
        },
        {
          role: "user",
          content: `当前是第 ${step} 个 AI 追问。客户回答：\n${transcript(answers)}`,
        },
      ],
      response_format: { type: "json_object" },
    } as never);
    const content = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content) as AIFollowup;
    if (parsed.skip && step === 3) {
      return NextResponse.json({ done: true, summary: buildTenSummary(answers) });
    }
    const text = String(parsed.question || "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 8 || text.length > 160) {
      return NextResponse.json(fallbackQuestion(step, answers));
    }
    const purpose =
      step === 1 ? "补最影响判断的缺口/矛盾" : step === 2 ? "确认隐性风险并推优先级" : "补最后一个重大缺口";
    return NextResponse.json({ done: false, question: question(step, text, purpose) });
  } catch {
    return NextResponse.json(fallbackQuestion(step, answers));
  }
}
