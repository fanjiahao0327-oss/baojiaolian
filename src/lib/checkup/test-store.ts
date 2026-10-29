import { getDb } from "@/lib/db";

export function isValidTestToken(token: string | undefined | null): boolean {
  const expected = process.env.CHECKUP_TEST_TOKEN;
  return Boolean(expected && token && token === expected);
}

export interface TestSessionInput {
  token: string;
  sessionId: string;
  route?: string;
  answers: unknown;
  report: unknown;
  userAgent?: string;
}

/**
 * 只在内测模式（指定 token）下保存完整回答和报告，用于复盘。
 * 正式客户默认不调用这里，对话内容仍然不落库。
 */
let tableReady = false;

async function ensureTable(): Promise<ReturnType<typeof getDb>> {
  const sql = getDb();
  if (tableReady) return sql;
  await sql`
    CREATE TABLE IF NOT EXISTS checkup_test_sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      route TEXT DEFAULT '',
      answers JSONB NOT NULL DEFAULT '[]',
      report JSONB,
      user_agent TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_checkup_test_sessions_created ON checkup_test_sessions(created_at DESC)`;
  tableReady = true;
  return sql;
}

export async function saveCheckupTestSession(input: TestSessionInput): Promise<boolean> {
  if (!isValidTestToken(input.token)) return false;
  const id = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sql = await ensureTable();
  await sql`
    INSERT INTO checkup_test_sessions (id, session_id, route, answers, report, user_agent)
    VALUES (
      ${id},
      ${input.sessionId},
      ${input.route ?? ""},
      ${JSON.stringify(input.answers)}::jsonb,
      ${JSON.stringify(input.report)}::jsonb,
      ${input.userAgent ?? ""}
    )
  `;
  return true;
}

export async function listRecentTestSessions(limit = 10): Promise<Array<Record<string, unknown>>> {
  const sql = getDb();
  const result = await sql`
    SELECT id, session_id, route, answers, report, created_at
    FROM checkup_test_sessions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result as unknown as Array<Record<string, unknown>>;
}
