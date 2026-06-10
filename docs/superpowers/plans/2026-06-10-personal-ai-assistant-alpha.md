# Personal AI Insurance Assistant Alpha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Alpha slice of the personal AI insurance assistant on the existing Baojiaolian Next.js system.

**Architecture:** Reuse the existing Next.js API, Neon PostgreSQL, authentication, coach prompts, encryption, points, and compliance guard. Add independent data entities for agent profile, assistant memory, client stage, tasks, product events, and ratings, then expose them through Web pages that mimic the future App information architecture: Today, Clients, Assistant, Mine.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind 4, Neon PostgreSQL, iron-session, DeepSeek OpenAI-compatible SDK, Node test runner with `tsx --test`.

---

## Scope Decision

The product design says the formal product shape is an iOS-first React Native App. This Alpha plan deliberately starts inside the existing Web/Next.js codebase because the current repository already contains production authentication, customer data, AI coach APIs, payments, security checks, and evaluation tooling.

This Alpha does not replace the App decision. It creates the backend and workflow foundation that the React Native App will reuse.

### Alpha Includes

- Agent profile and first operating blueprint.
- User-confirmed AI memory center.
- Today page with actionable tasks.
- Existing client page upgraded with relationship stage and next actions.
- Unified Assistant page for two first-use paths.
- Minimal events and 1-to-5 helpfulness ratings.
- Security regression checks and TypeScript verification.

### Alpha Excludes

- React Native project scaffolding.
- TestFlight build.
- Apple in-app purchase.
- PDF, Word, OCR, audio transcription, or screenshots.
- Hotspot radar and self-media source monitoring.
- Full subscription migration from points to membership quota.

These excluded items become separate implementation plans after the Alpha loop is validated.

---

## File Structure

### Create

- `eval/assistantAlpha.test.ts`
  - Pure TypeScript regression tests for the Alpha helper functions.

- `src/lib/assistant-alpha.ts`
  - Shared types, stage labels, input normalizers, task builders, event names, and rating helpers.

- `src/lib/assistant-data.ts`
  - Database access functions for agent profiles, memories, tasks, stage events, product events, and ratings.

- `src/lib/assistant-prompt.ts`
  - Prompt builder for the unified assistant Alpha modes.

- `src/app/api/agent-profile/route.ts`
  - GET/PUT agent profile and operating blueprint.

- `src/app/api/assistant/memories/route.ts`
  - List and create proposed or confirmed memories.

- `src/app/api/assistant/memories/[id]/route.ts`
  - Confirm, edit, reject, or delete a memory.

- `src/app/api/assistant/tasks/route.ts`
  - List, create, update, delay, and complete assistant tasks.

- `src/app/api/assistant/events/route.ts`
  - Record product events.

- `src/app/api/assistant/ratings/route.ts`
  - Record 1-to-5 helpfulness ratings with reason tags.

- `src/app/api/assistant/route.ts`
  - Unified assistant API for Alpha modes.

- `src/app/assistant/page.tsx`
  - Unified Assistant page.

- `src/app/mine/page.tsx`
  - Mine page with agent profile and memory center.

- `src/components/BottomNav.tsx`
  - Four-entry mobile-style navigation: Today, Clients, Assistant, Mine.

- `src/components/AgentProfilePanel.tsx`
  - Profile intake, blueprint display, and edit controls.

- `src/components/MemoryCenter.tsx`
  - Memory list, status controls, edit, and delete.

- `src/components/TodayTaskList.tsx`
  - Today page task sections.

- `src/components/AssistantWorkspace.tsx`
  - Unified assistant task-type selector, input form, response display, and rating control.

### Modify

- `src/lib/db.ts`
  - Add Alpha tables and migration-safe `ALTER TABLE` statements.

- `src/types/index.ts`
  - Add shared Alpha UI/API types.

- `src/app/page.tsx`
  - Convert from single coach workspace into Today page with task summary and quick entry points.

- `src/app/clients/page.tsx`
  - Show stage, confidence, evidence, next action, and shortcut to Assistant.

- `src/components/AppShell.tsx`
  - Add bottom navigation for non-login pages.

- `src/components/Header.tsx`
  - Rename product language to “保险 AI 助手” and add Assistant/Mine entry points.

- `src/app/api/clients/[id]/route.ts`
  - Include latest client stage and open tasks in the detail response.

- `src/app/api/conversations/route.ts`
  - Preserve compatibility and add task type metadata if present.

- `src/app/api/feedback/route.ts`
  - Keep existing helpful/unhelpful feedback, and optionally mirror feedback to `user_ratings` when score payload exists.

- `scripts/check-security-regressions.mjs`
  - Add static checks for new privacy, memory, and task boundaries.

- `package.json`
  - Keep existing scripts; no new package is required for Alpha.

---

## Task 1: Add Alpha Regression Tests

**Files:**
- Create: `eval/assistantAlpha.test.ts`

- [ ] **Step 1: Write failing tests**

Create `eval/assistantAlpha.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";

test("client stage labels cover the ten relationship stages", async () => {
  const alpha = await import("../src/lib/assistant-alpha").catch(
    () => ({} as Record<string, unknown>),
  );

  assert.equal(typeof alpha.getClientStageLabel, "function");
  const getClientStageLabel = alpha.getClientStageLabel as (stage: number) => string;

  assert.equal(getClientStageLabel(1), "待激活关系");
  assert.equal(getClientStageLabel(4), "需求探索");
  assert.equal(getClientStageLabel(9), "已成交并持续服务");
  assert.equal(getClientStageLabel(10), "暂缓或停止推进");
  assert.equal(getClientStageLabel(999), "未知阶段");
});

test("memory status transitions require user confirmation before long-term use", async () => {
  const alpha = await import("../src/lib/assistant-alpha").catch(
    () => ({} as Record<string, unknown>),
  );

  assert.equal(typeof alpha.canUseMemoryInLongTermContext, "function");
  const canUseMemoryInLongTermContext = alpha.canUseMemoryInLongTermContext as (
    status: string,
  ) => boolean;

  assert.equal(canUseMemoryInLongTermContext("proposed"), false);
  assert.equal(canUseMemoryInLongTermContext("confirmed"), true);
  assert.equal(canUseMemoryInLongTermContext("rejected"), false);
});

test("today task builder separates must-do and suggested actions", async () => {
  const { buildTodaySections } = await import("../src/lib/assistant-alpha");

  const result = buildTodaySections([
    {
      id: 1,
      title: "给张先生发送资料",
      taskType: "explicit_followup",
      priority: "must",
      status: "open",
      dueAt: "2026-06-10T09:00:00.000Z",
      clientName: "张先生",
    },
    {
      id: 2,
      title: "建议联系李姐",
      taskType: "ai_suggested_followup",
      priority: "suggested",
      status: "open",
      dueAt: null,
      clientName: "李姐",
    },
  ]);

  assert.equal(result.mustDo.length, 1);
  assert.equal(result.suggested.length, 1);
  assert.equal(result.mustDo[0].title, "给张先生发送资料");
  assert.equal(result.suggested[0].title, "建议联系李姐");
});

test("rating normalization accepts only 1 to 5 scores and known reason tags", async () => {
  const { normalizeRatingInput } = await import("../src/lib/assistant-alpha");

  assert.deepEqual(
    normalizeRatingInput({
      taskType: "client_quick_help",
      score: 5,
      reasonTags: ["natural", "actionable", "personalized", "invalid_tag"],
      comment: "这次建议能直接用",
    }),
    {
      taskType: "client_quick_help",
      score: 5,
      reasonTags: ["natural", "actionable", "personalized"],
      comment: "这次建议能直接用",
    },
  );

  assert.throws(
    () => normalizeRatingInput({ taskType: "client_quick_help", score: 6 }),
    /评分必须是 1 到 5/,
  );
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
npm run test:eval
```

Expected: `eval/assistantAlpha.test.ts` fails because `src/lib/assistant-alpha.ts` does not exist.

- [ ] **Step 3: Commit test if running subagent mode**

If using one-task-per-commit execution, commit only the new failing test:

```bash
git add eval/assistantAlpha.test.ts
git commit -m "test: add assistant alpha regressions"
```

If using inline execution, keep the failing test uncommitted until Task 2 turns it green.

---

## Task 2: Add Alpha Shared Types And Helpers

**Files:**
- Create: `src/lib/assistant-alpha.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Implement helper module**

Create `src/lib/assistant-alpha.ts` with:

```ts
export type ClientStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const CLIENT_STAGE_LABELS: Record<ClientStage, string> = {
  1: "待激活关系",
  2: "已恢复联系",
  3: "初步了解",
  4: "需求探索",
  5: "需求明确",
  6: "方案准备",
  7: "方案沟通",
  8: "决策跟进",
  9: "已成交并持续服务",
  10: "暂缓或停止推进",
};

export type MemoryStatus = "proposed" | "confirmed" | "rejected";
export type MemoryScope = "agent" | "client" | "global";
export type TaskPriority = "must" | "suggested" | "long_term";
export type TaskStatus = "open" | "done" | "dismissed" | "delayed";

export type AssistantTaskType =
  | "explicit_followup"
  | "ai_suggested_followup"
  | "profile_setup"
  | "content_plan"
  | "daily_review"
  | "weekly_review"
  | "coach_training";

export type AssistantMode =
  | "agent_blueprint"
  | "client_quick_help"
  | "daily_review"
  | "content_idea";

export interface TodayTask {
  id: number;
  title: string;
  taskType: AssistantTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  clientName?: string | null;
}

export interface TodaySections {
  mustDo: TodayTask[];
  suggested: TodayTask[];
  longTerm: TodayTask[];
}

export const RATING_REASON_TAGS = [
  "natural",
  "actionable",
  "personalized",
  "professional",
  "too_salesy",
  "not_accurate",
  "too_generic",
  "privacy_concern",
] as const;

export function getClientStageLabel(stage: number): string {
  return CLIENT_STAGE_LABELS[stage as ClientStage] ?? "未知阶段";
}

export function canUseMemoryInLongTermContext(status: string): boolean {
  return status === "confirmed";
}

export function buildTodaySections(tasks: TodayTask[]): TodaySections {
  const openTasks = tasks.filter((task) => task.status === "open");
  return {
    mustDo: openTasks.filter((task) => task.priority === "must"),
    suggested: openTasks.filter((task) => task.priority === "suggested"),
    longTerm: openTasks.filter((task) => task.priority === "long_term"),
  };
}

export function normalizeRatingInput(input: {
  taskType: string;
  score: number;
  reasonTags?: string[];
  comment?: string;
}) {
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error("评分必须是 1 到 5");
  }

  const allowed = new Set<string>(RATING_REASON_TAGS);
  return {
    taskType: String(input.taskType || "unknown").slice(0, 64),
    score: input.score,
    reasonTags: (input.reasonTags || []).filter((tag) => allowed.has(tag)),
    comment: String(input.comment || "").slice(0, 500),
  };
}
```

- [ ] **Step 2: Extend shared types**

Append exports to `src/types/index.ts`:

```ts
export type {
  AssistantMode,
  AssistantTaskType,
  ClientStage,
  MemoryScope,
  MemoryStatus,
  TaskPriority,
  TaskStatus,
  TodayTask,
  TodaySections,
} from "@/lib/assistant-alpha";

export interface AgentProfileSnapshot {
  basics: string;
  experience: string;
  strengths: string;
  customerResources: string;
  contentPreference: string;
  weeklyTimeBudget: string;
  businessGoal: string;
  constraints: string;
}

export interface AgentBlueprint {
  selfUnderstanding: string;
  mainPositioning: string;
  explorationDirections: string[];
  targetCustomers: string[];
  contentPillars: string[];
  channelSuggestions: string[];
  sevenDayActions: string[];
  evidence: string[];
}
```

- [ ] **Step 3: Verify green for new helper tests**

Run:

```bash
npm run test:eval
```

Expected: all eval tests pass.

- [ ] **Step 4: Verify TypeScript**

Run:

```bash
npm run lint
```

Expected: TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add eval/assistantAlpha.test.ts src/lib/assistant-alpha.ts src/types/index.ts
git commit -m "feat: add assistant alpha helpers"
```

---

## Task 3: Add Alpha Database Tables

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Add migration-safe tables**

In `initDB()` after existing `payment_orders` table setup, add:

```ts
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
```

- [ ] **Step 2: Add static regression assertions**

In `scripts/check-security-regressions.mjs`, after the conversation assertions, add:

```js
const dbModule = read("src/lib/db.ts");
assert(
  dbModule.includes("agent_profiles") &&
    dbModule.includes("assistant_memories") &&
    dbModule.includes("client_stage_events") &&
    dbModule.includes("assistant_tasks") &&
    dbModule.includes("product_events") &&
    dbModule.includes("user_ratings"),
  "assistant alpha tables should exist as independent entities instead of overloading kyc_snapshot",
);
assert(
  dbModule.includes("CHECK(scope IN ('agent','client','global'))") &&
    dbModule.includes("CHECK(status IN ('proposed','confirmed','rejected'))"),
  "assistant memories should have explicit scope and confirmation status constraints",
);
```

- [ ] **Step 3: Verify regression checks**

Run:

```bash
npm run check:security
npm run lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts scripts/check-security-regressions.mjs
git commit -m "feat: add assistant alpha schema"
```

---

## Task 4: Add Assistant Data Services

**Files:**
- Create: `src/lib/assistant-data.ts`

- [ ] **Step 1: Implement data access helpers**

Create `src/lib/assistant-data.ts`:

```ts
import { getDb, row, rows } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import type { AgentBlueprint, AgentProfileSnapshot } from "@/types";
import type { MemoryScope, MemoryStatus, TaskPriority, TaskStatus, TodayTask } from "@/lib/assistant-alpha";

function parseEncryptedJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(decrypt(value)) as T;
  } catch {
    return fallback;
  }
}

export async function getAgentProfile(userId: number) {
  const sql = getDb();
  const result = await sql`
    SELECT profile_snapshot, blueprint_snapshot, updated_at
    FROM agent_profiles
    WHERE user_id = ${userId}
  `;
  const profile = rows<{ profile_snapshot: string; blueprint_snapshot: string; updated_at: string }>(result)[0];
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
    ...memory,
    content: decrypt(memory.content),
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
  const sql = getDb();
  const result = await sql`
    INSERT INTO assistant_memories (
      user_id, client_id, scope, memory_type, title, content, source_type, source_ref, confidence, status
    )
    VALUES (
      ${input.userId},
      ${input.clientId || null},
      ${input.scope},
      ${input.memoryType},
      ${input.title.slice(0, 120)},
      ${encrypt(input.content.slice(0, 4000))},
      ${input.sourceType || "manual"},
      ${input.sourceRef || ""},
      ${Math.max(0, Math.min(100, input.confidence ?? 80))},
      ${input.status || "proposed"}
    )
    RETURNING id
  `;
  return Number(row<{ id: number }>(result).id);
}

export async function updateMemoryStatus(userId: number, id: number, status: MemoryStatus) {
  const sql = getDb();
  const result = await sql`
    UPDATE assistant_memories
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows(result).length > 0;
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
```

- [ ] **Step 2: Run TypeScript**

Run:

```bash
npm run lint
```

Expected: TypeScript exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/assistant-data.ts
git commit -m "feat: add assistant alpha data services"
```

---

## Task 5: Add Agent Profile And Memory APIs

**Files:**
- Create: `src/app/api/agent-profile/route.ts`
- Create: `src/app/api/assistant/memories/route.ts`
- Create: `src/app/api/assistant/memories/[id]/route.ts`

- [ ] **Step 1: Add profile route**

Create `src/app/api/agent-profile/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAgentProfile, upsertAgentProfile } from "@/lib/assistant-data";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json((await getAgentProfile(session.userId)) || {
    profileSnapshot: {},
    blueprintSnapshot: {},
    updatedAt: null,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  await upsertAgentProfile(
    session.userId,
    body.profileSnapshot || {},
    body.blueprintSnapshot || {},
  );
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Add memories list/create route**

Create `src/app/api/assistant/memories/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createMemory, listMemories } from "@/lib/assistant-data";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  return NextResponse.json(await listMemories(session.userId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const id = await createMemory({
    userId: session.userId,
    clientId: body.clientId ? Number(body.clientId) : null,
    scope: body.scope === "client" ? "client" : body.scope === "global" ? "global" : "agent",
    memoryType: String(body.memoryType || "note"),
    title: String(body.title || "未命名记忆"),
    content: String(body.content || ""),
    sourceType: String(body.sourceType || "manual"),
    sourceRef: String(body.sourceRef || ""),
    confidence: Number(body.confidence || 80),
    status: body.status === "confirmed" ? "confirmed" : "proposed",
  });

  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 3: Add memory status/delete route**

Create `src/app/api/assistant/memories/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteMemory, updateMemoryStatus } from "@/lib/assistant-data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const status = body.status === "confirmed"
    ? "confirmed"
    : body.status === "rejected"
      ? "rejected"
      : "proposed";
  const ok = await updateMemoryStatus(session.userId, Number(id), status);
  if (!ok) return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteMemory(session.userId, Number(id));
  if (!ok) return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run check:security
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agent-profile/route.ts src/app/api/assistant/memories/route.ts 'src/app/api/assistant/memories/[id]/route.ts'
git commit -m "feat: add agent profile and memory APIs"
```

---

## Task 6: Add Tasks, Events, Ratings, And Today API

**Files:**
- Modify: `src/lib/assistant-data.ts`
- Create: `src/app/api/assistant/tasks/route.ts`
- Create: `src/app/api/assistant/events/route.ts`
- Create: `src/app/api/assistant/ratings/route.ts`
- Modify: `src/app/api/feedback/route.ts`

- [ ] **Step 1: Add data service functions**

Append these exports to `src/lib/assistant-data.ts`:

```ts
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
      ${input.taskType},
      ${input.score},
      ${JSON.stringify(input.reasonTags)},
      ${input.comment}
    )
  `;
}
```

- [ ] **Step 2: Add task route**

Create `src/app/api/assistant/tasks/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createTask, listTodayTasks, updateTaskStatus } from "@/lib/assistant-data";
import { buildTodaySections } from "@/lib/assistant-alpha";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const tasks = await listTodayTasks(session.userId);
  return NextResponse.json({ tasks, sections: buildTodaySections(tasks) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const body = await request.json();
  const id = await createTask({
    userId: session.userId,
    clientId: body.clientId ? Number(body.clientId) : null,
    title: String(body.title || "未命名任务"),
    taskType: String(body.taskType || "ai_suggested_followup"),
    priority: body.priority === "must" || body.priority === "long_term" ? body.priority : "suggested",
    dueAt: body.dueAt || null,
    sourceType: String(body.sourceType || "manual"),
    sourceId: String(body.sourceId || ""),
    payload: body.payload || {},
  });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const body = await request.json();
  const status = body.status === "done" || body.status === "dismissed" || body.status === "delayed"
    ? body.status
    : "open";
  const ok = await updateTaskStatus(session.userId, Number(body.id), status);
  if (!ok) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Add event and rating routes**

Create `src/app/api/assistant/events/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordProductEvent } from "@/lib/assistant-data";

export async function POST(request: NextRequest) {
  const session = await getSession();
  const body = await request.json();
  await recordProductEvent({
    userId: session.userId || null,
    eventName: String(body.eventName || "unknown"),
    eventPath: String(body.eventPath || ""),
    metadata: body.metadata || {},
  });
  return NextResponse.json({ success: true });
}
```

Create `src/app/api/assistant/ratings/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { normalizeRatingInput } from "@/lib/assistant-alpha";
import { recordUserRating } from "@/lib/assistant-data";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const rating = normalizeRatingInput(body);
  await recordUserRating({
    userId: session.userId,
    conversationId: body.conversationId ? Number(body.conversationId) : null,
    ...rating,
  });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Keep existing feedback compatible**

Modify `src/app/api/feedback/route.ts` so the existing helpful/unhelpful route still works. If `score` exists in the payload, normalize and save it through `recordUserRating`; otherwise preserve current behavior.

- [ ] **Step 5: Verify**

Run:

```bash
npm run test:eval
npm run lint
npm run check:security
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/assistant-data.ts src/app/api/assistant/tasks/route.ts src/app/api/assistant/events/route.ts src/app/api/assistant/ratings/route.ts src/app/api/feedback/route.ts
git commit -m "feat: add assistant tasks events and ratings"
```

---

## Task 7: Add Unified Assistant Alpha API

**Files:**
- Create: `src/lib/assistant-prompt.ts`
- Create: `src/app/api/assistant/route.ts`

- [ ] **Step 1: Add prompt builder**

Create `src/lib/assistant-prompt.ts`:

```ts
import type { AssistantMode } from "@/lib/assistant-alpha";

const MODE_INSTRUCTIONS: Record<AssistantMode, string> = {
  agent_blueprint: "你正在帮助保险代理人建立个人经营蓝图。先提炼个人定位，再给出2到3条探索方向和7天行动建议。",
  client_quick_help: "你正在帮助保险代理人处理一个真实客户卡点。先判断信息是否足够，再给出自然、不强推保险的下一步建议。",
  daily_review: "你正在做日复盘。提炼今天发生的事、客户经营线索、内容素材和明天最重要的行动。",
  content_idea: "你正在帮助保险代理人把真实素材转成内容。降低推销感，保持个人真实性，并提示合规风险。",
};

export function buildAssistantAlphaMessages(params: {
  mode: AssistantMode;
  userInput: string;
  agentProfile?: Record<string, unknown>;
  clientContext?: Record<string, unknown>;
  confirmedMemories?: Array<{ title: string; content: string }>;
}) {
  const memories = (params.confirmedMemories || [])
    .slice(0, 12)
    .map((memory) => `- ${memory.title}：${memory.content}`)
    .join("\n");

  const system = [
    "你是保险代理人的私人 AI 助手，默认风格是温和、理性、顾问式。",
    "你不是监管机构，不给正式合规审批结论。",
    "不要自动承诺收益、理赔、核保或成交结果。",
    "不要把关系维护强行切到保险话题。",
    "区分事实、代理人判断和 AI 推测。",
    "涉及客户或代理人的长期记忆时，只能提出待确认建议，不能假装已经写入。",
    MODE_INSTRUCTIONS[params.mode],
  ].join("\n");

  return [
    { role: "system" as const, content: system },
    {
      role: "user" as const,
      content: [
        `任务模式：${params.mode}`,
        `代理人画像：${JSON.stringify(params.agentProfile || {})}`,
        `客户上下文：${JSON.stringify(params.clientContext || {})}`,
        `已确认记忆：\n${memories || "暂无"}`,
        `用户输入：\n${params.userInput}`,
      ].join("\n\n"),
    },
  ];
}
```

- [ ] **Step 2: Add API route**

Create `src/app/api/assistant/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { getAgentProfile, listMemories, recordProductEvent } from "@/lib/assistant-data";
import { buildAssistantAlphaMessages } from "@/lib/assistant-prompt";
import type { AssistantMode } from "@/lib/assistant-alpha";
import { ensureCoachResponseCompliance } from "@/lib/coach-compliance";

function normalizeMode(value: unknown): AssistantMode {
  if (
    value === "agent_blueprint" ||
    value === "client_quick_help" ||
    value === "daily_review" ||
    value === "content_idea"
  ) {
    return value;
  }
  return "client_quick_help";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const mode = normalizeMode(body.mode);
  const userInput = String(body.userInput || "").trim();
  if (!userInput) {
    return NextResponse.json({ error: "请先输入要处理的内容" }, { status: 400 });
  }

  const [profile, memories] = await Promise.all([
    getAgentProfile(session.userId),
    listMemories(session.userId),
  ]);

  const confirmedMemories = memories
    .filter((memory) => memory.status === "confirmed")
    .map((memory) => ({ title: memory.title, content: memory.content }));

  const messages = buildAssistantAlphaMessages({
    mode,
    userInput,
    agentProfile: profile?.profileSnapshot || {},
    clientContext: body.clientContext || {},
    confirmedMemories,
  });

  const completion = await getAIClient().chat.completions.create({
    ...noThinkingConfig({ userId: session.userId }),
    messages,
    stream: false,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const compliance = await ensureCoachResponseCompliance(raw, async (rewritePrompt) => {
    const rewrite = await getAIClient().chat.completions.create({
      ...noThinkingConfig({ userId: session.userId }),
      messages: [
        ...messages,
        { role: "assistant", content: raw },
        { role: "user", content: rewritePrompt },
      ],
      stream: false,
    });
    return rewrite.choices[0]?.message?.content || "";
  });

  await recordProductEvent({
    userId: session.userId,
    eventName: "assistant_alpha_run",
    eventPath: "/assistant",
    metadata: {
      mode,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      rewritten: compliance.rewritten,
    },
  });

  return NextResponse.json({
    content: compliance.content,
    mode,
    rewritten: compliance.rewritten,
  });
}
```

- [ ] **Step 3: Verify**

Run:

```bash
npm run lint
npm run check:security
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assistant-prompt.ts src/app/api/assistant/route.ts
git commit -m "feat: add unified assistant alpha API"
```

---

## Task 8: Add Today, Assistant, Mine, And Navigation UI

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/TodayTaskList.tsx`
- Create: `src/components/AssistantWorkspace.tsx`
- Create: `src/components/AgentProfilePanel.tsx`
- Create: `src/components/MemoryCenter.tsx`
- Create: `src/app/assistant/page.tsx`
- Create: `src/app/mine/page.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add bottom navigation**

Create `src/components/BottomNav.tsx` with entries:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "今天" },
  { href: "/clients", label: "客户" },
  { href: "/assistant", label: "助手" },
  { href: "/mine", label: "我的" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden bg-white border-t border-gray-100 grid grid-cols-4 h-14 shrink-0">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={active ? "text-brand-600 text-xs font-semibold" : "text-gray-400 text-xs"}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Mount bottom navigation**

Modify `src/components/AppShell.tsx`:

```tsx
import BottomNav from "@/components/BottomNav";
```

Render `<BottomNav />` after the scrollable content area for non-login pages.

- [ ] **Step 3: Add Today task list**

Create `src/components/TodayTaskList.tsx` to fetch `/api/assistant/tasks`, render three sections named `必须处理`, `建议推进`, `长期经营`, and provide `完成` / `忽略` buttons that call PATCH `/api/assistant/tasks`.

- [ ] **Step 4: Convert homepage to Today**

Replace `src/app/page.tsx` with a Today page that:

- Shows product name “保险 AI 助手”.
- Loads `TodayTaskList`.
- Provides quick buttons to `/assistant?mode=client_quick_help`, `/assistant?mode=agent_blueprint`, and `/clients`.
- Does not remove the existing coach functionality from the codebase; the old KYC/coach form remains reachable through client quick-help migration later if needed.

- [ ] **Step 5: Add Assistant workspace**

Create `src/components/AssistantWorkspace.tsx` with:

- Mode selector: `客户问题`, `个人经营蓝图`, `日复盘`, `内容建议`.
- Textarea for input.
- Submit button calling POST `/api/assistant`.
- Markdown-style plain response display.
- 1-to-5 rating buttons calling `/api/assistant/ratings`.

- [ ] **Step 6: Add Assistant page**

Create `src/app/assistant/page.tsx`:

```tsx
import AssistantWorkspace from "@/components/AssistantWorkspace";

export default function AssistantPage() {
  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      <AssistantWorkspace />
    </main>
  );
}
```

- [ ] **Step 7: Add Mine page**

Create `src/app/mine/page.tsx` that renders `AgentProfilePanel` and `MemoryCenter`.

- [ ] **Step 8: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/BottomNav.tsx src/components/TodayTaskList.tsx src/components/AssistantWorkspace.tsx src/components/AgentProfilePanel.tsx src/components/MemoryCenter.tsx src/app/assistant/page.tsx src/app/mine/page.tsx src/components/AppShell.tsx src/components/Header.tsx src/app/page.tsx
git commit -m "feat: add assistant alpha web shell"
```

---

## Task 9: Upgrade Client Detail With Stage And Next Action

**Files:**
- Modify: `src/lib/assistant-data.ts`
- Modify: `src/app/api/clients/[id]/route.ts`
- Modify: `src/app/clients/page.tsx`

- [ ] **Step 1: Add latest stage helper**

Append to `src/lib/assistant-data.ts`:

```ts
export async function getLatestClientStage(userId: number, clientId: number) {
  const sql = getDb();
  const result = await sql`
    SELECT stage, basis, confidence, created_at
    FROM client_stage_events
    WHERE user_id = ${userId} AND client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const stage = rows<{ stage: number; basis: string; confidence: number; created_at: string }>(result)[0];
  if (!stage) return null;
  return {
    stage: stage.stage,
    basis: decrypt(stage.basis),
    confidence: stage.confidence,
    createdAt: stage.created_at,
  };
}
```

- [ ] **Step 2: Include stage in client detail API**

In `src/app/api/clients/[id]/route.ts`, import `getLatestClientStage` and include `stageInfo` in the JSON response:

```ts
const stageInfo = await getLatestClientStage(session.userId, numId);
return NextResponse.json({ ...rest, kyc_snapshot: kycSnapshot, conversations, stageInfo });
```

- [ ] **Step 3: Display stage in client page**

In `src/app/clients/page.tsx`:

- Extend `ClientDetail` with `stageInfo`.
- Render stage label with `getClientStageLabel`.
- Show basis and confidence when present.
- Add button `带着这个客户找助手` that navigates to `/assistant?mode=client_quick_help&clientId=<id>`.

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant-data.ts 'src/app/api/clients/[id]/route.ts' src/app/clients/page.tsx
git commit -m "feat: show client stage in assistant alpha"
```

---

## Task 10: Final Verification And Alpha Handoff

**Files:**
- No new implementation files.

- [ ] **Step 1: Run full local verification**

Run:

```bash
npm run test:eval
npm run check:security
npm run lint
npm run build
git diff --check
```

Expected:

- Eval tests pass.
- Security checks pass.
- TypeScript exits 0.
- Next build exits 0.
- `git diff --check` has no output.

- [ ] **Step 2: Inspect changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only Alpha implementation files and this plan are changed, plus any pre-existing unrelated user changes still visible outside the Alpha commit set.

- [ ] **Step 3: Start local dev server for user review**

Run:

```bash
npm run dev
```

Expected: server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 4: Verify in browser**

Use Browser or Playwright to open the local URL and check:

- Today page loads.
- Bottom navigation works on mobile width.
- Assistant page submits an input and shows an AI result when environment variables are present.
- Mine page can save profile data.
- Memory center lists, confirms, and deletes a memory.
- Client page still loads existing clients.

- [ ] **Step 5: Commit final Alpha implementation**

If tasks were not already committed individually:

```bash
git add eval/assistantAlpha.test.ts src/lib/assistant-alpha.ts src/lib/assistant-data.ts src/lib/assistant-prompt.ts src/lib/db.ts src/types/index.ts scripts/check-security-regressions.mjs src/app src/components
git commit -m "feat: build assistant alpha slice"
```

- [ ] **Step 6: Report residual scope**

Final handoff must state:

- Alpha is Web/Next.js validation slice, not TestFlight App.
- Existing mini program remains unchanged unless files under `miniprogram/` were modified.
- React Native App shell, file/OCR/audio, hotspot radar, and subscription quota need separate implementation plans.

---

## Self-Review

### Spec Coverage

- Personal assistant direction: covered by unified Assistant page and API.
- Two first-use paths: covered by `agent_blueprint` and `client_quick_help` modes.
- Today page: covered by Today task API and UI.
- Customer stage and next action: covered by client detail upgrade.
- Memory center: covered by memory APIs and Mine page.
- Feedback metrics: covered by product events and 1-to-5 ratings.
- Compliance baseline: covered by reusing `ensureCoachResponseCompliance`.
- App direction: acknowledged as later React Native plan after Alpha backend/workflow validation.

### Gaps Moved To Later Plans

- React Native App and TestFlight.
- File, OCR, Word, PDF, and audio import.
- Hotspot radar and content source monitoring.
- Apple subscription and unified membership quota.
- Data export, account deletion, and full privacy operations.

These are excluded from Alpha to keep the first implementation testable and reviewable.

### Verification Standard

No task is complete without fresh command output from the listed verification commands.
