import { NextRequest, NextResponse } from "next/server";
import { createMemory, listMemories } from "@/lib/assistant-data";
import { getSession } from "@/lib/auth";
import type { MemoryScope } from "@/lib/assistant-alpha";

function normalizeScope(value: unknown): MemoryScope {
  if (value === "client" || value === "global") return value;
  return "agent";
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json(await listMemories(session.userId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = String(body.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "记忆内容不能为空" }, { status: 400 });
    }

    const id = await createMemory({
      userId: session.userId,
      clientId: body.clientId ? Number(body.clientId) : null,
      scope: normalizeScope(body.scope),
      memoryType: String(body.memoryType || "note"),
      title: String(body.title || "未命名记忆"),
      content,
      sourceType: String(body.sourceType || "manual"),
      sourceRef: String(body.sourceRef || ""),
      confidence: Number(body.confidence || 80),
      status: body.status === "confirmed" ? "confirmed" : "proposed",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建记忆失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
