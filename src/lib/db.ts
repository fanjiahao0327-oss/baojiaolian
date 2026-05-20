import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function getDb(): ReturnType<typeof neon> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL 未设置');
    _sql = neon(url);
  }
  return _sql;
}

/** 将 neon 查询结果断言为单行对象数组 */
export function row<T = Record<string, unknown>>(result: unknown): T {
  const arr = result as T[];
  return arr[0];
}

/** 将 neon 查询结果断言为多行对象数组 */
export function rows<T = Record<string, unknown>>(result: unknown): T[] {
  return result as T[];
}

export async function initDB() {
  const s = getDb();

  await s`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE,
      wechat_openid TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT UNIQUE`;
  await s`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

  await s`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL DEFAULT '未命名客户',
      kyc_snapshot TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('charge', 'consume')),
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      client_id INTEGER REFERENCES clients(id),
      title TEXT NOT NULL DEFAULT '',
      messages TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','won','lost')),
      total_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_input_tokens INTEGER NOT NULL DEFAULT 0`;
  await s`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_output_tokens INTEGER NOT NULL DEFAULT 0`;

  await s`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      conversation_id INTEGER REFERENCES conversations(id),
      message_idx INTEGER NOT NULL,
      rating TEXT NOT NULL CHECK(rating IN ('helpful','unhelpful')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      order_no TEXT UNIQUE NOT NULL,
      points INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled','expired')),
      payment_method TEXT DEFAULT 'wechat',
      payment_ref TEXT DEFAULT '',
      admin_note TEXT DEFAULT '',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
    )
  `;
  await s`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
}
