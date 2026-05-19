import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows, row } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const sql = getDb();
  const rawRows = await sql`SELECT id, name, kyc_snapshot, updated_at FROM clients WHERE user_id = ${session.userId} ORDER BY updated_at DESC`;

  const list = rows(rawRows).map((r: Record<string, unknown>) => {
    let age = "";
    let gender = "";
    let city = "";
    try {
      const kyc = JSON.parse(decrypt(r.kyc_snapshot as string));
      if (kyc.age) age = String(kyc.age);
      if (kyc.gender) gender = kyc.gender === "male" ? "男" : kyc.gender === "female" ? "女" : String(kyc.gender);
      if (kyc.city) city = String(kyc.city);
    } catch { /* decrypt failed, leave empty */ }

    return {
      id: r.id,
      name: r.name,
      age,
      gender,
      city,
      updated_at: r.updated_at,
    };
  });

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { name, kycSnapshot } = body;

  const sql = getDb();
  const result = await sql`INSERT INTO clients (user_id, name, kyc_snapshot) VALUES (${session.userId}, ${name || "未命名客户"}, ${encrypt(JSON.stringify(kycSnapshot || {}))}) RETURNING id`;

  return NextResponse.json({ id: Number(row<{ id: number }>(result).id) }, { status: 201 });
}
