import { NextRequest, NextResponse } from "next/server";
import { getAgentProfile, upsertAgentProfile } from "@/lib/assistant-data";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json(
    (await getAgentProfile(session.userId)) || {
      profileSnapshot: {},
      blueprintSnapshot: {},
      updatedAt: null,
    },
  );
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  await upsertAgentProfile(
    session.userId,
    body.profileSnapshot || {},
    body.blueprintSnapshot || {},
  );
  return NextResponse.json({ success: true });
}
