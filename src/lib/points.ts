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

export async function consumePoints(
  userId: number,
  requestedAmount: number,
  description: string
): Promise<number> {
  const amount = Math.max(0, Math.ceil(requestedAmount));
  if (amount <= 0) return 0;

  const sql = getDb();
  const result = await sql`
    WITH lock AS (
      SELECT pg_advisory_xact_lock(${userId}) AS locked
    ),
    balance AS (
      SELECT COALESCE(SUM(pt.amount), 0)::int AS balance
      FROM lock
      LEFT JOIN point_transactions pt ON pt.user_id = ${userId}
    ),
    debit AS (
      SELECT LEAST(${amount}, GREATEST(balance, 0))::int AS amount
      FROM balance
    ),
    inserted AS (
      INSERT INTO point_transactions (user_id, amount, type, description)
      SELECT ${userId}, -debit.amount, 'consume', ${description}
      FROM debit
      WHERE debit.amount > 0
      RETURNING -amount AS deducted
    )
    SELECT COALESCE((SELECT deducted FROM inserted), 0)::int AS deducted
  `;

  return Number(rows<{ deducted: number }>(result)[0]?.deducted ?? 0);
}
