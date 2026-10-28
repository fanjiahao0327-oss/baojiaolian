import { NextRequest, NextResponse } from "next/server";
import { deleteMemory, updateMemory } from "@/lib/assistant-data";
import { getSession } from "@/lib/auth";
import type { MemoryStatus } from "@/lib/assistant-alpha";

function normalizeStatus(value: unknown): MemoryStatus | undefined {
  if (value === "confirmed" || value === "rejected" || value === "proposed") {
    return value;
  }
  return undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const ok = await updateMemory({
    userId: session.userId,
    id: Number(id),
    title: body.title !== undefined ? String(body.title) : undefined,
    content: body.content !== undefined ? String(body.content) : undefined,
    status: normalizeStatus(body.status),
  });
  if (!ok) {
    return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteMemory(session.userId, Number(id));
  if (!ok) {
    return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
