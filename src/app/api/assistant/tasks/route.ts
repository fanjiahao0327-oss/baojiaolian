import { NextRequest, NextResponse } from "next/server";
import { buildTodaySections } from "@/lib/assistant-alpha";
import { createTask, listTodayTasks, updateTaskStatus } from "@/lib/assistant-data";
import { getSession } from "@/lib/auth";
import type { TaskPriority, TaskStatus } from "@/lib/assistant-alpha";

function normalizePriority(value: unknown): TaskPriority {
  if (value === "must" || value === "long_term") return value;
  return "suggested";
}

function normalizeStatus(value: unknown): TaskStatus {
  if (value === "done" || value === "dismissed" || value === "delayed") return value;
  return "open";
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const tasks = await listTodayTasks(session.userId);
  return NextResponse.json({ tasks, sections: buildTodaySections(tasks) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 });
    }

    const id = await createTask({
      userId: session.userId,
      clientId: body.clientId ? Number(body.clientId) : null,
      title,
      taskType: String(body.taskType || "ai_suggested_followup"),
      priority: normalizePriority(body.priority),
      dueAt: body.dueAt || null,
      sourceType: String(body.sourceType || "manual"),
      sourceId: String(body.sourceId || ""),
      payload: body.payload || {},
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const ok = await updateTaskStatus(session.userId, Number(body.id), normalizeStatus(body.status));
  if (!ok) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
