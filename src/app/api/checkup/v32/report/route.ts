import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { buildV32Report, type V32Answer } from "@/lib/checkup/v32";
import { saveCheckupTestSession } from "@/lib/checkup/test-store";

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

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:v32-report:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const answers = normalizeAnswers(body.answers);
  if (answers.length < 8) return NextResponse.json({ error: "请先完成 8 个入口题" }, { status: 400 });

  const report = buildV32Report(answers);
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
  const text = JSON.stringify(report);
  const banned = ["保本", "稳赚", "保证领取", "复星", "友邦", "国寿", "万欣和"];
  const hits = banned.filter((word) => text.includes(word));
  if (hits.length > 0) {
    report.disclaimer = `${report.disclaimer} 本报告已过滤不合规表述。`;
  }
  return NextResponse.json({ mode: "v32", report, testSaved });
}
