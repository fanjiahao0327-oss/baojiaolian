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
      wechat_session_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT UNIQUE`;
  await s`ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_session_key TEXT`;
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

  await s`
    CREATE TABLE IF NOT EXISTS agent_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      profile_snapshot TEXT NOT NULL DEFAULT '{}',
      blueprint_snapshot TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS assistant_memories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      client_id INTEGER REFERENCES clients(id),
      scope TEXT NOT NULL CHECK(scope IN ('agent','client','global')),
      memory_type TEXT NOT NULL DEFAULT 'note',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_ref TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 80,
      status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','confirmed','rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS client_stage_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      stage INTEGER NOT NULL CHECK(stage BETWEEN 1 AND 10),
      basis TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 60 CHECK(confidence BETWEEN 0 AND 100),
      source_conversation_id INTEGER REFERENCES conversations(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS assistant_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      client_id INTEGER REFERENCES clients(id),
      title TEXT NOT NULL,
      task_type TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('must','suggested','long_term')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done','dismissed','delayed')),
      due_at TIMESTAMPTZ,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_id TEXT NOT NULL DEFAULT '',
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS product_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      event_name TEXT NOT NULL,
      event_path TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`
    CREATE TABLE IF NOT EXISTS user_ratings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      conversation_id INTEGER REFERENCES conversations(id),
      task_type TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
      reason_tags TEXT NOT NULL DEFAULT '[]',
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await s`CREATE INDEX IF NOT EXISTS idx_assistant_memories_user_updated ON assistant_memories(user_id, updated_at DESC)`;
  await s`CREATE INDEX IF NOT EXISTS idx_assistant_tasks_user_status_due ON assistant_tasks(user_id, status, due_at)`;
  await s`CREATE INDEX IF NOT EXISTS idx_client_stage_events_client_created ON client_stage_events(client_id, created_at DESC)`;
  await s`CREATE INDEX IF NOT EXISTS idx_product_events_user_created ON product_events(user_id, created_at DESC)`;

  await s`
    CREATE TABLE IF NOT EXISTS checkup_orders (
      id SERIAL PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      openid TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','cancelled','expired','refunded')),
      session_id TEXT NOT NULL,
      payment_method TEXT DEFAULT 'wechat',
      payment_ref TEXT DEFAULT '',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
    )
  `;
  await s`
    CREATE TABLE IF NOT EXISTS checkup_appointments (
      id SERIAL PRIMARY KEY,
      name_enc TEXT NOT NULL,
      phone_enc TEXT NOT NULL,
      time_window TEXT NOT NULL,
      question TEXT DEFAULT '',
      openid TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new','contacted','scheduled','done','invalid')),
      admin_note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await s`
    CREATE TABLE IF NOT EXISTS checkup_events (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await s`
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
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_orders_session ON checkup_orders(session_id)`;
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_appointments_status ON checkup_appointments(status, created_at DESC)`;
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_events_name ON checkup_events(event_name, created_at DESC)`;
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_test_sessions_created ON checkup_test_sessions(created_at DESC)`;
}
