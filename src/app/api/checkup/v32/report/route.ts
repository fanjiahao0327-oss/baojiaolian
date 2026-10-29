import { NextRequest, NextResponse } from "next/server";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { rateLimit } from "@/lib/rate-limit";
import { buildV32Report, type V32Answer, type V32Report } from "@/lib/checkup/v32";
import { saveCheckupTestSession } from "@/lib/checkup/test-store";

const BANNED = ["保本", "稳赚", "保证领取", "复利", "收益承诺", "无效", "必须公证"];

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

function hasRequired(answers: V32Answer[]): boolean {
  return ["v32_q1", "v32_q2", "v32_q4", "v32_q3", "v32_q5", "v32_q6", "v32_q7"].every((id) =>
    answers.some((answer) => answer.questionId === id),
  );
}

function validate(raw: unknown, brief: V32Report): V32Report | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const conclusion = String(data.conclusion || "").trim();
  const heard = Array.isArray(data.heard) ? data.heard.map(String).map((x) => x.trim()).filter(Boolean) : [];
  const issuesRaw = Array.isArray(data.issues) ? data.issues : [];
  const issues = issuesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const i = item as Record<string, unknown>;
      const priority: "高" | "中" | "低" = i.priority === "高" || i.priority === "低" ? i.priority : "中";
      return {
        title: String(i.title || "").trim().slice(0, 40),
        phenomenon: String(i.phenomenon || "").trim().slice(0, 200),
        why: String(i.why || "").trim().slice(0, 240),
        solution: String(i.solution || "").trim().slice(0, 240),
        firstStep: String(i.firstStep || "").trim().slice(0, 160),
        priority,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item && item.title && item.solution));
  if (!conclusion || heard.length < 2 || issues.length < 1) return null;
  const text = JSON.stringify({ conclusion, heard, issues });
  if (BANNED.some((word) => text.includes(word))) return null;
  return { ...brief, conclusion, heard, issues: issues.slice(0, 3) };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:v32-report:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const answers = normalizeAnswers(body.answers);
  if (!hasRequired(answers)) return NextResponse.json({ error: "请先完成入口题" }, { status: 400 });

  const brief = buildV32Report(answers);
  let report = brief;

  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const completion = await getAIClient().chat.completions.create({
        ...noThinkingConfig(),
        max_tokens: 1400,
        messages: [
          {
            role: "system",
            content:
              "你是家庭风险筛查报告的撰写顾问。把给定的结构化简报改写成 4 段中文报告，只输出 JSON：{\"conclusion\":\"一句话结论\",\"heard\":[\"2-3句我听到的情况\"],\"issues\":[{\"title\":\"\",\"phenomenon\":\"\",\"why\":\"\",\"solution\":\"\",\"firstStep\":\"\",\"priority\":\"高|中|低\"}],\"nextStep\":\"\"}。规则：只使用简报事实，不新增客户没说过的内容；不推荐产品/公司/保费/收益；不下法律结论；不恐吓；不罗列客户原话；每个问题必须给“怎么解决+先做一步”；最多 3 个问题；口语、短句。简报：",
          },
          { role: "user", content: JSON.stringify({ conclusion: brief.conclusion, heard: brief.heard, issues: brief.issues, nextStep: brief.nextStep, facts: brief.facts }) },
        ],
        response_format: { type: "json_object" },
      } as never);
      const content = completion.choices[0]?.message?.content || "";
      report = validate(JSON.parse(content), brief) ?? brief;
    } catch {
      report = brief;
    }
  }

  let testSaved = false;
  try {
    testSaved = await saveCheckupTestSession({
      token: String(body.testToken || ""),
      sessionId: String(body.sessionId || ""),
      route: String(body.route || ""),
      answers,
      report,
      userAgent: request.headers.get("user-agent") || "",
    });
  } catch {
    testSaved = false;
  }

  return NextResponse.json({ mode: "v33", report, testSaved });
}
