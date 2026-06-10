import { decrypt, encrypt } from "@/lib/crypto";
import { getDb, row, rows } from "@/lib/db";
import type { AgentBlueprint, AgentProfileSnapshot } from "@/types";
import type {
  MemoryScope,
  MemoryStatus,
  TaskPriority,
  TaskStatus,
  TodayTask,
} from "@/lib/assistant-alpha";

function parseEncryptedJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(decrypt(value)) as T;
  } catch {
    return fallback;
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function assertClientOwned(userId: number, clientId?: number | null) {
  if (!clientId) return;
  const sql = getDb();
  const result = await sql`SELECT id FROM clients WHERE id = ${clientId} AND user_id = ${userId}`;
  if (rows(result).length === 0) {
    throw new Error("客户不存在或无权访问");
  }
}

export async function getAgentProfile(userId: number) {
  const sql = getDb();
  const result = await sql`
    SELECT profile_snapshot, blueprint_snapshot, updated_at
    FROM agent_profiles
    WHERE user_id = ${userId}
  `;
  const profile = rows<{
    profile_snapshot: string;
    blueprint_snapshot: string;
    updated_at: string;
  }>(result)[0];
  if (!profile) return null;

  return {
    profileSnapshot: parseEncryptedJson<Partial<AgentProfileSnapshot>>(profile.profile_snapshot, {}),
    blueprintSnapshot: parseEncryptedJson<Partial<AgentBlueprint>>(profile.blueprint_snapshot, {}),
    updatedAt: profile.updated_at,
  };
}

export async function upsertAgentProfile(
  userId: number,
  profileSnapshot: Partial<AgentProfileSnapshot>,
  blueprintSnapshot: Partial<AgentBlueprint>,
) {
  const sql = getDb();
  await sql`
    INSERT INTO agent_profiles (user_id, profile_snapshot, blueprint_snapshot)
    VALUES (${userId}, ${encrypt(JSON.stringify(profileSnapshot))}, ${encrypt(JSON.stringify(blueprintSnapshot))})
    ON CONFLICT (user_id)
    DO UPDATE SET
      profile_snapshot = EXCLUDED.profile_snapshot,
      blueprint_snapshot = EXCLUDED.blueprint_snapshot,
      updated_at = NOW()
  `;
}

export async function listMemories(userId: number) {
  const sql = getDb();
  const result = await sql`
    SELECT id, client_id, scope, memory_type, title, content, source_type, source_ref, confidence, status, updated_at
    FROM assistant_memories
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;

  return rows<{
    id: number;
    client_id: number | null;
    scope: MemoryScope;
    memory_type: string;
    title: string;
    content: string;
    source_type: string;
    source_ref: string;
    confidence: number;
    status: MemoryStatus;
    updated_at: string;
  }>(result).map((memory) => ({
    id: memory.id,
    clientId: memory.client_id,
    scope: memory.scope,
    memoryType: memory.memory_type,
    title: memory.title,
    content: decrypt(memory.content),
    sourceType: memory.source_type,
    sourceRef: memory.source_ref,
    confidence: memory.confidence,
    status: memory.status,
    updatedAt: memory.updated_at,
  }));
}

export async function createMemory(input: {
  userId: number;
  clientId?: number | null;
  scope: MemoryScope;
  memoryType: string;
  title: string;
  content: string;
  sourceType?: string;
  sourceRef?: string;
  confidence?: number;
  status?: MemoryStatus;
}) {
  await assertClientOwned(input.userId, input.clientId);
  const sql = getDb();
  const result = await sql`
    INSERT INTO assistant_memories (
      user_id, client_id, scope, memory_type, title, content, source_type, source_ref, confidence, status
    )
    VALUES (
      ${input.userId},
      ${input.clientId || null},
      ${input.scope},
      ${input.memoryType.slice(0, 64)},
      ${input.title.slice(0, 120)},
      ${encrypt(input.content.slice(0, 4000))},
      ${input.sourceType || "manual"},
      ${input.sourceRef || ""},
      ${clampInt(input.confidence ?? 80, 0, 100)},
      ${input.status || "proposed"}
    )
    RETURNING id
  `;
  return Number(row<{ id: number }>(result).id);
}

export async function updateMemory(input: {
  userId: number;
  id: number;
  title?: string;
  content?: string;
  status?: MemoryStatus;
}) {
  const sql = getDb();
  const existingRows = await sql`
    SELECT title, content, status
    FROM assistant_memories
    WHERE id = ${input.id} AND user_id = ${input.userId}
  `;
  const existing = rows<{ title: string; content: string; status: MemoryStatus }>(existingRows)[0];
  if (!existing) return false;

  const nextTitle = input.title !== undefined ? input.title.slice(0, 120) : existing.title;
  const nextContent = input.content !== undefined
    ? encrypt(input.content.slice(0, 4000))
    : existing.content;
  const nextStatus = input.status || existing.status;

  await sql`
    UPDATE assistant_memories
    SET title = ${nextTitle},
        content = ${nextContent},
        status = ${nextStatus},
        updated_at = NOW()
    WHERE id = ${input.id} AND user_id = ${input.userId}
  `;
  return true;
}

export async function updateMemoryStatus(userId: number, id: number, status: MemoryStatus) {
  return updateMemory({ userId, id, status });
}

export async function deleteMemory(userId: number, id: number) {
  const sql = getDb();
  const result = await sql`
    DELETE FROM assistant_memories
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows(result).length > 0;
}

export async function listTodayTasks(userId: number): Promise<TodayTask[]> {
  const sql = getDb();
  const result = await sql`
    SELECT t.id, t.title, t.task_type, t.priority, t.status, t.due_at, c.name AS client_name
    FROM assistant_tasks t
    LEFT JOIN clients c ON c.id = t.client_id AND c.user_id = t.user_id
    WHERE t.user_id = ${userId}
      AND t.status = 'open'
    ORDER BY
      CASE t.priority WHEN 'must' THEN 1 WHEN 'suggested' THEN 2 ELSE 3 END,
      t.due_at ASC NULLS LAST,
      t.updated_at DESC
    LIMIT 50
  `;

  return rows<{
    id: number;
    title: string;
    task_type: TodayTask["taskType"];
    priority: TaskPriority;
    status: TaskStatus;
    due_at: string | null;
    client_name: string | null;
  }>(result).map((task) => ({
    id: task.id,
    title: task.title,
    taskType: task.task_type,
    priority: task.priority,
    status: task.status,
    dueAt: task.due_at,
    clientName: task.client_name,
  }));
}

export async function createTask(input: {
  userId: number;
  clientId?: number | null;
  title: string;
  taskType: string;
  priority: TaskPriority;
  dueAt?: string | null;
  sourceType?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
}) {
  await assertClientOwned(input.userId, input.clientId);
  const sql = getDb();
  const result = await sql`
    INSERT INTO assistant_tasks (
      user_id, client_id, title, task_type, priority, due_at, source_type, source_id, payload
    )
    VALUES (
      ${input.userId},
      ${input.clientId || null},
      ${input.title.slice(0, 160)},
      ${input.taskType.slice(0, 64)},
      ${input.priority},
      ${input.dueAt || null},
      ${input.sourceType || "manual"},
      ${input.sourceId || ""},
      ${encrypt(JSON.stringify(input.payload || {}))}
    )
    RETURNING id
  `;
  return Number(row<{ id: number }>(result).id);
}

export async function updateTaskStatus(userId: number, id: number, status: TaskStatus) {
  const sql = getDb();
  const result = await sql`
    UPDATE assistant_tasks
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows(result).length > 0;
}

export async function recordProductEvent(input: {
  userId?: number | null;
  eventName: string;
  eventPath?: string;
  metadata?: Record<string, unknown>;
}) {
  const sql = getDb();
  await sql`
    INSERT INTO product_events (user_id, event_name, event_path, metadata)
    VALUES (
      ${input.userId || null},
      ${input.eventName.slice(0, 80)},
      ${(input.eventPath || "").slice(0, 160)},
      ${encrypt(JSON.stringify(input.metadata || {}))}
    )
  `;
}

export async function recordUserRating(input: {
  userId: number;
  conversationId?: number | null;
  taskType: string;
  score: number;
  reasonTags: string[];
  comment: string;
}) {
  const sql = getDb();
  await sql`
    INSERT INTO user_ratings (user_id, conversation_id, task_type, score, reason_tags, comment)
    VALUES (
      ${input.userId},
      ${input.conversationId || null},
      ${input.taskType.slice(0, 64)},
      ${clampInt(input.score, 1, 5)},
      ${JSON.stringify(input.reasonTags)},
      ${input.comment.slice(0, 500)}
    )
  `;
}

export async function getLatestClientStage(userId: number, clientId: number) {
  const sql = getDb();
  const result = await sql`
    SELECT stage, basis, confidence, created_at
    FROM client_stage_events
    WHERE user_id = ${userId} AND client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const stage = rows<{
    stage: number;
    basis: string;
    confidence: number;
    created_at: string;
  }>(result)[0];
  if (!stage) return null;

  return {
    stage: stage.stage,
    basis: decrypt(stage.basis),
    confidence: stage.confidence,
    createdAt: stage.created_at,
  };
}
