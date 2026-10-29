import { NextRequest, NextResponse } from "next/server";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { rateLimit } from "@/lib/rate-limit";
import type { Route } from "@/lib/checkup/v32";

const ROUTES: Route[] = ["A", "B", "C", "D", "E", "F", "G"];

function fallback(text: string): { primary: Route; secondary: Route | null } {
  const rules: Array<[Route, RegExp]> = [
    ["A", /(住院|看病|体检|报销|药|医疗)/],
    ["B", /(大病|倒下|撑不住|癌症|手术)/],
    ["C", /(退休|养老|老了|每月领)/],
    ["D", /(孩子|上学|出国|教育|买房)/],
    ["E", /(遗产|给谁|传下去|孩子以后)/],
    ["F", /(生意|公司|贷款|担保|经营|创业|股权)/],
  ];
  const hits = rules.filter(([, pattern]) => pattern.test(text)).map(([route]) => route);
  return { primary: hits[0] ?? "G", secondary: hits[1] ?? null };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:v32-classify:${ip}`, "checkup");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const text = String(body.text || "").trim().slice(0, 800);
  if (!text) return NextResponse.json({ primary: "G", secondary: null });

  const local = fallback(text);
  if (!process.env.DEEPSEEK_API_KEY) return NextResponse.json(local);

  try {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: '你是家庭风险测评的语义归类器。把客户第一句话归到 A-G，并给出主关注和次关注。只输出 JSON：{"primary":"A|B|C|D|E|F|G","secondary":"A|B|C|D|E|F|G|null"}。A=医疗 B=大病 C=养老 D=子女教育 E=传承 F=生意 G=说不清。只按客户原话归类，不猜；提到多个方向时保留两个；只提一个方向时 secondary 为 null。',
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    } as never);
    const content = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content) as { primary?: string; secondary?: string | null };
    const primary = ROUTES.includes(parsed.primary as Route) ? (parsed.primary as Route) : local.primary;
    const secondary =
      parsed.secondary && ROUTES.includes(parsed.secondary as Route) && parsed.secondary !== "G" && parsed.secondary !== primary
        ? (parsed.secondary as Route)
        : local.secondary && local.secondary !== primary
          ? local.secondary
          : null;
    return NextResponse.json({ primary, secondary });
  } catch {
    return NextResponse.json(local);
  }
}
