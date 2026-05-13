import { getDb, rows } from '@/lib/db';

export const COST_PER_CALL = 1;
export const INITIAL_POINTS = 50;

export async function getBalance(userId: number): Promise<number> {
  const sql = getDb();
  const result = await sql`SELECT COALESCE(SUM(amount), 0) as balance FROM point_transactions WHERE user_id = ${userId}`;
  return Number(rows<{ balance: number }>(result)[0]?.balance ?? 0);
}
