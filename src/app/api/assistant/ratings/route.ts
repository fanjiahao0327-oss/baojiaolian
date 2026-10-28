import { NextRequest, NextResponse } from "next/server";
import { normalizeRatingInput } from "@/lib/assistant-alpha";
import { recordUserRating } from "@/lib/assistant-data";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rating = normalizeRatingInput(body);
    await recordUserRating({
      userId: session.userId,
      conversationId: body.conversationId ? Number(body.conversationId) : null,
      ...rating,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "评分失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
