import { NextRequest, NextResponse } from "next/server";
import { getDatabaseCapacityReport } from "@/lib/capacity";
import { isAdminKeyValid } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  if (!isAdminKeyValid(adminKey)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const capacity = await getDatabaseCapacityReport();
    return NextResponse.json({ capacity });
  } catch (error) {
    console.error("[admin/capacity] query failed", error);
    return NextResponse.json({ error: "容量监控查询失败" }, { status: 500 });
  }
}
