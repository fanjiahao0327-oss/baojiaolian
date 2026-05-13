import { getDb } from "@/lib/db";

export const COST_PER_CALL = 1;
export const INITIAL_POINTS = 50;

export function getBalance(userId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM point_transactions WHERE user_id = ?")
    .get(userId) as { balance: number };
  return row.balance;
}
