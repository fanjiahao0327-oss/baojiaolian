import crypto from "crypto";
import { getDb, rows } from "@/lib/db";

export function buildOrderNo(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `CK-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function isOrderExpired(order: { expires_at: string }, now = new Date()): boolean {
  return new Date(order.expires_at).getTime() < now.getTime();
}

export function canUnlock(order: { status: string; session_id: string }, sessionId: string): boolean {
  return order.status === "paid" && order.session_id === sessionId;
}

export async function createCheckupOrder(input: { openid: string; sessionId: string }) {
  const sql = getDb();
  const orderNo = buildOrderNo();
  const result = await sql`
    INSERT INTO checkup_orders (order_no, openid, session_id)
    VALUES (${orderNo}, ${input.openid}, ${input.sessionId})
    RETURNING id, order_no, status, expires_at
  `;
  return rows<{ id: number; order_no: string; status: string; expires_at: string }>(result)[0];
}

export async function getCheckupOrder(orderNo: string) {
  const sql = getDb();
  const result = await sql`SELECT * FROM checkup_orders WHERE order_no = ${orderNo}`;
  return rows<Record<string, unknown>>(result)[0] ?? null;
}

export async function markCheckupOrderPaid(orderNo: string, paymentRef: string) {
  const sql = getDb();
  const result = await sql`
    UPDATE checkup_orders SET status = 'paid', payment_ref = ${paymentRef}, paid_at = NOW()
    WHERE order_no = ${orderNo} AND status = 'pending'
    RETURNING order_no
  `;
  return rows<{ order_no: string }>(result).length > 0;
}

export async function createCheckupAppointment(input: {
  nameEnc: string; phoneEnc: string; timeWindow: string; question: string; openid: string;
}) {
  const sql = getDb();
  const result = await sql`
    INSERT INTO checkup_appointments (name_enc, phone_enc, time_window, question, openid)
    VALUES (${input.nameEnc}, ${input.phoneEnc}, ${input.timeWindow}, ${input.question}, ${input.openid})
    RETURNING id
  `;
  return rows<{ id: number }>(result)[0];
}

export async function listCheckupAppointments() {
  const sql = getDb();
  const result = await sql`SELECT * FROM checkup_appointments ORDER BY created_at DESC LIMIT 200`;
  return rows<Record<string, unknown>>(result);
}

export async function recordCheckupEvent(sessionId: string, eventName: string, payload: Record<string, unknown> = {}) {
  const sql = getDb();
  await sql`
    INSERT INTO checkup_events (session_id, event_name, payload)
    VALUES (${sessionId}, ${eventName}, ${JSON.stringify(payload)})
  `;
}
