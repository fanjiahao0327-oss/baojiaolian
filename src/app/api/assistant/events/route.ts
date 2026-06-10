import { NextRequest, NextResponse } from "next/server";
import { recordProductEvent } from "@/lib/assistant-data";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  const body = await request.json();

  await recordProductEvent({
    userId: session.userId || null,
    eventName: String(body.eventName || "unknown"),
    eventPath: String(body.eventPath || ""),
    metadata: body.metadata || {},
  });

  return NextResponse.json({ success: true });
}
