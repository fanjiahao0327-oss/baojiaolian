import { NextRequest, NextResponse } from "next/server";
import { isAdminKeyValid } from "@/lib/security";
import { decrypt } from "@/lib/crypto";
import { listCheckupAppointments } from "@/lib/checkup/store";

export async function GET(request: NextRequest) {
  if (!isAdminKeyValid(request.headers.get("x-admin-key"))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const rows = await listCheckupAppointments();
  return NextResponse.json({
    appointments: rows.map((row) => ({
      id: row.id,
      name: decrypt(String(row.name_enc || "")),
      phone: decrypt(String(row.phone_enc || "")),
      timeWindow: row.time_window,
      question: row.question,
      status: row.status,
      createdAt: row.created_at,
    })),
  });
}
