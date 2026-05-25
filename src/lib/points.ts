import { getDb, rows } from '@/lib/db';

export const POINTS_PER_1000_TOKENS = 0.5;
export const MIN_BALANCE = 5;
export const INITIAL_POINTS = 30;

export function calcPoints(inputTokens: number, outputTokens: number): number {
  return Math.ceil((inputTokens + outputTokens) / 2000);
}

export async function getBalance(userId: number): Promise<number> {
  const sql = getDb();
  const result = await sql`SELECT COALESCE(SUM(amount), 0) as balance FROM point_transactions WHERE user_id = ${userId}`;
  return Number(rows<{ balance: number }>(result)[0]?.balance ?? 0);
}
