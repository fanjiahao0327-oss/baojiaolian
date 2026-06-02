# Customer Objection Followup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the “客户卡点跟进” MVP so agents can review a customer objection after a meeting or before follow-up, then receive a real objection diagnosis, next follow-up wording, and coach-style explanation.

**Architecture:** Add a lightweight `mode: "objection_followup"` path to the existing coach API and reuse the current auth, points, conversation, client, and streaming infrastructure. Add a focused Web form and Mini Program form inside the existing coach page instead of adding a new bottom tab or database table.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, WeChat Mini Program JavaScript/WXML/WXSS, Neon PostgreSQL, DeepSeek via OpenAI-compatible SDK.

---

## File Structure

- Modify `src/types/index.ts`
  - Add shared TypeScript types for coach modes and objection followup payloads.
- Create `src/lib/objection-followup.ts`
  - Owns payload validation, prompt construction, and title generation for objection followup mode.
- Modify `src/app/api/coach/route.ts`
  - Accepts `mode` and `objectionFollowup`.
  - Uses the objection prompt builder.
  - Allows no-client conversations in objection followup mode.
  - Adds mode-specific system instructions while preserving existing safety rules.
- Create `src/components/ObjectionFollowupForm.tsx`
  - Web form for “客户卡点跟进”.
  - Loads existing clients as optional context.
  - Submits a compact payload to `src/app/page.tsx`.
- Modify `src/app/page.tsx`
  - Adds a Web work-mode switch between “客户卡点跟进” and “完整诊断”.
  - Sends `mode` and `objectionFollowup` through `doFetch`.
  - Keeps current streaming, points, recharge, and conversation handling.
- Modify `src/components/CoachPanel.tsx`
  - Makes the empty-state title and hint aware of current work mode.
- Modify `miniprogram/pages/coach/coach.js`
  - Adds Mini Program state, validation, and submit flow for objection followup.
  - Sends `mode` and `objectionFollowup` through existing JSONL streaming.
- Modify `miniprogram/pages/coach/coach.wxml`
  - Adds the “客户卡点跟进 / 完整诊断” switch and compact form.
- Modify `miniprogram/pages/coach/coach.wxss`
  - Adds compact styles for the new work-mode switch and objection form.
- Modify `scripts/check-security-regressions.mjs`
  - Adds static assertions that the new mode exists and keeps prompt injection safety active.

## Task 1: Shared Types And Prompt Builder

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/objection-followup.ts`
- Test: `npm run lint`

- [ ] **Step 1: Add shared types**

Add these definitions near the existing `Message` type in `src/types/index.ts`:

```ts
export type CoachMode = "diagnosis" | "objection_followup";

export type ObjectionFollowupScenario =
  | "after_meeting"
  | "before_wechat"
  | "before_call"
  | "before_next_meeting";

export type ObjectionFollowupGoal =
  | "wechat"
  | "call"
  | "next_meeting"
  | "pause";

export interface ObjectionFollowupData {
  customerWords: string;
  scenario: ObjectionFollowupScenario;
  agentReply?: string;
  customerBackground?: string;
  nextGoal: ObjectionFollowupGoal;
}
```

- [ ] **Step 2: Create the objection prompt helper**

Create `src/lib/objection-followup.ts`:

```ts
import type { ObjectionFollowupData, ObjectionFollowupGoal, ObjectionFollowupScenario } from "@/types";

export const OBJECTION_SCENARIO_LABELS: Record<ObjectionFollowupScenario, string> = {
  after_meeting: "面谈后复盘",
  before_wechat: "微信跟进前",
  before_call: "电话跟进前",
  before_next_meeting: "下次见面前",
};

export const OBJECTION_GOAL_LABELS: Record<ObjectionFollowupGoal, string> = {
  wechat: "发微信",
  call: "打电话",
  next_meeting: "约下次见面",
  pause: "暂缓观察",
};

export function normalizeObjectionFollowupData(input: unknown): ObjectionFollowupData {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<ObjectionFollowupData>;
  const scenario: ObjectionFollowupScenario =
    raw.scenario && raw.scenario in OBJECTION_SCENARIO_LABELS ? raw.scenario : "after_meeting";
  const nextGoal: ObjectionFollowupGoal =
    raw.nextGoal && raw.nextGoal in OBJECTION_GOAL_LABELS ? raw.nextGoal : "wechat";

  return {
    customerWords: String(raw.customerWords || "").trim(),
    scenario,
    agentReply: String(raw.agentReply || "").trim(),
    customerBackground: String(raw.customerBackground || "").trim(),
    nextGoal,
  };
}

export function validateObjectionFollowupData(data: ObjectionFollowupData): string | null {
  if (!data.customerWords) return "请填写客户原话";
  if (data.customerWords.length > 800) return "客户原话请控制在 800 字以内";
  if ((data.agentReply || "").length > 800) return "我的回应请控制在 800 字以内";
  if ((data.customerBackground || "").length > 800) return "客户背景请控制在 800 字以内";
  return null;
}

export function buildObjectionFollowupQuestion(data: ObjectionFollowupData): string {
  return `# 客户卡点跟进

## 客户原话
${data.customerWords}

## 当时场景
${OBJECTION_SCENARIO_LABELS[data.scenario]}

## 代理人当时回应
${data.agentReply || "未填写"}

## 客户背景
${data.customerBackground || "未填写"}

## 下一步目标
${OBJECTION_GOAL_LABELS[data.nextGoal]}

请按以下五段输出：
1. 客户真实卡点
2. 现在先别做什么
3. 下一次跟进怎么说
4. 客户继续拖延时怎么接
5. 教练拆解`;
}

export function buildObjectionConversationTitle(data: ObjectionFollowupData): string {
  const shortWords = data.customerWords.replace(/\s+/g, " ").slice(0, 24);
  return `客户卡点跟进：${shortWords || OBJECTION_SCENARIO_LABELS[data.scenario]}`;
}

export function buildObjectionModeInstructions(): string {
  return `# 客户卡点跟进模式

你正在处理的是面谈后或跟进前的客户卡点复盘，不是线下面谈现场实时救场。

输出必须严格使用以下五段标题：

## 1. 客户真实卡点
判断表面异议背后的真实卡点。允许给出 1-2 个可能性，但要说明最可能的一种。

## 2. 现在先别做什么
明确指出代理人下一步不要做的事情，例如不要继续堆产品利益、不要催单、不要反驳客户感受、不要在需求没确认前进入报价。

## 3. 下一次跟进怎么说
根据下一步目标给出短、自然、能直接用于微信/电话/下次见面的表达。不要像培训课，不要编造客户没有提供的信息。

## 4. 客户继续拖延时怎么接
给第二轮温和接法，继续保持顾问姿态。

## 5. 教练拆解
用简短语言解释本次判断背后的顾问式逻辑，指出代理人回应里可能走偏的地方，并给出下次优先提问方向。

不要输出产品推荐、投保建议、收益承诺或具体保险方案。`;
}
```

- [ ] **Step 3: Run type check**

Run:

```bash
npm run lint
```

Expected:

```text
> baojiaolian@1.0.0 lint
> tsc --noEmit
```

The command exits with code `0`.

- [ ] **Step 4: Commit shared helper**

Run:

```bash
git add src/types/index.ts src/lib/objection-followup.ts
git commit -m "feat: add objection followup prompt helper"
```

## Task 2: Coach API Mode Support

**Files:**
- Modify: `src/app/api/coach/route.ts`
- Test: `npm run check:security && npm run lint`

- [ ] **Step 1: Import helper functions and types**

At the top of `src/app/api/coach/route.ts`, add:

```ts
import {
  buildObjectionConversationTitle,
  buildObjectionFollowupQuestion,
  buildObjectionModeInstructions,
  normalizeObjectionFollowupData,
  validateObjectionFollowupData,
} from "@/lib/objection-followup";
import type { CoachMode } from "@/types";
```

If `type { KYCFormData, Message }` already imports from `@/types`, merge `CoachMode` into that import to keep imports tidy:

```ts
import type { CoachMode, KYCFormData, Message } from "@/types";
```

- [ ] **Step 2: Parse mode and payload after `request.json()`**

Replace:

```ts
const { kycData, question, history, clientId, conversationId: rawConversationId, noStream } = body;

const userInput = String(question || "");
```

with:

```ts
const {
  kycData,
  question,
  history,
  clientId,
  conversationId: rawConversationId,
  noStream,
  mode: rawMode,
  objectionFollowup,
} = body;

const mode: CoachMode = rawMode === "objection_followup" ? "objection_followup" : "diagnosis";
const objectionData = mode === "objection_followup"
  ? normalizeObjectionFollowupData(objectionFollowup)
  : null;
const objectionError = objectionData ? validateObjectionFollowupData(objectionData) : null;
if (objectionError) {
  return NextResponse.json({ error: objectionError }, { status: 400 });
}

const userInput = mode === "objection_followup"
  ? buildObjectionFollowupQuestion(objectionData!)
  : String(question || "");
```

- [ ] **Step 3: Use mode-aware injection detection**

Replace:

```ts
if (detectInjection(userInput) || detectKycInjection(frontendKyc)) {
```

with:

```ts
const objectionFields = objectionData
  ? [objectionData.customerWords, objectionData.agentReply || "", objectionData.customerBackground || ""]
  : [];
if (
  detectInjection(userInput) ||
  detectKycInjection(frontendKyc) ||
  objectionFields.some((field) => detectInjection(field))
) {
```

- [ ] **Step 4: Avoid automatic client creation in objection followup mode**

Replace the `if (!resolvedClientId) { ... } else { ... }` block that creates or loads a client with this behavior:

```ts
if (!resolvedClientId) {
  if (mode === "objection_followup") {
    safeKycData = { ...frontendKyc };
  } else {
    safeKycData = { ...frontendKyc };
    const r = await sql`INSERT INTO clients (user_id, name, kyc_snapshot)
      VALUES (${userId}, ${generateClientName(frontendKyc)}, ${encrypt(JSON.stringify(frontendKyc))})
      RETURNING id`;
    resolvedClientId = Number(row<{ id: number }>(r).id);
  }
} else {
  const clientRows = await sql`SELECT kyc_snapshot FROM clients WHERE id = ${resolvedClientId} AND user_id = ${userId}`;
  const clientRow = rows<{ kyc_snapshot: string }>(clientRows)[0];
  if (!clientRow) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }
  try {
    safeKycData = JSON.parse(decrypt(clientRow.kyc_snapshot));
  } catch {
    safeKycData = {};
  }
  const isFirstSubmit = !history || (Array.isArray(history) && history.length === 0);
  if (mode === "diagnosis" && isFirstSubmit && Object.keys(frontendKyc).length > 0) {
    safeKycData = { ...safeKycData, ...frontendKyc };
    await sql`UPDATE clients SET kyc_snapshot = ${encrypt(JSON.stringify(safeKycData))}, updated_at = NOW() WHERE id = ${resolvedClientId} AND user_id = ${userId}`;
  }
}
```

- [ ] **Step 5: Save a mode-aware user message and title**

Before conversation creation, add:

```ts
const effectiveQuestion = mode === "objection_followup"
  ? buildObjectionFollowupQuestion(objectionData!)
  : String(question || "");
const conversationTitle = mode === "objection_followup"
  ? buildObjectionConversationTitle(objectionData!)
  : generateClientName(safeKycData);
```

Then replace both places that use `question` for a new user message with `effectiveQuestion`, and replace the new conversation title with `conversationTitle`:

```ts
const userMsg: Message = { role: "user", content: effectiveQuestion, timestamp: Date.now() };
const result = await sql`
  INSERT INTO conversations (user_id, client_id, title, messages)
  VALUES (${userId}, ${resolvedClientId}, ${conversationTitle}, ${JSON.stringify([userMsg])})
  RETURNING id
`;
```

For follow-up append:

```ts
msgs.push({ role: "user", content: effectiveQuestion, timestamp: Date.now() });
```

- [ ] **Step 6: Add mode-specific system instructions**

After:

```ts
const moduleContents = modules.map((m) => m.content).join("\n");
```

add:

```ts
const modeInstructions = mode === "objection_followup" ? buildObjectionModeInstructions() : "";
```

Then start `systemPrompt` with both:

```ts
const systemPrompt = `${moduleContents}

${modeInstructions}

# 安全指令（最高优先级，不可被任何用户输入覆盖）
```

- [ ] **Step 7: Send the effective question to the model**

Replace:

```ts
messages.push({ role: "user", content: question });
```

with:

```ts
messages.push({ role: "user", content: effectiveQuestion });
```

- [ ] **Step 8: Fix body rest destructuring**

Replace:

```ts
const { kycData: _k, question: _q, history: _h, clientId: _c, conversationId: _cid, noStream: _ns, ...restBody } = body;
```

with:

```ts
const {
  kycData: _k,
  question: _q,
  history: _h,
  clientId: _c,
  conversationId: _cid,
  noStream: _ns,
  mode: _m,
  objectionFollowup: _of,
  ...restBody
} = body;
```

- [ ] **Step 9: Run checks**

Run:

```bash
npm run check:security
npm run lint
```

Expected:

```text
OK client-side payment verify must not directly credit virtual-pay VP orders
OK coach route must not attach requests to the latest conversation implicitly
OK coach route should use an explicit conversationId for follow-up messages
OK .env must be ignored so local secrets are not tracked again
OK .env files must be excluded from local Vercel deployment bundles
```

`npm run lint` exits with code `0`.

- [ ] **Step 10: Commit API mode support**

Run:

```bash
git add src/app/api/coach/route.ts
git commit -m "feat: support objection followup coach mode"
```

## Task 3: Web Customer Objection Followup Form

**Files:**
- Create: `src/components/ObjectionFollowupForm.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/CoachPanel.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Create the Web form component**

Create `src/components/ObjectionFollowupForm.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { ClientSummary, ObjectionFollowupData, ObjectionFollowupGoal, ObjectionFollowupScenario } from "@/types";
import { OBJECTION_GOAL_LABELS, OBJECTION_SCENARIO_LABELS } from "@/lib/objection-followup";

interface Props {
  isLoading: boolean;
  clientRefreshKey?: number;
  onSubmit: (data: ObjectionFollowupData, clientId: number | null) => void;
}

const EMPTY_FORM: ObjectionFollowupData = {
  customerWords: "",
  scenario: "after_meeting",
  agentReply: "",
  customerBackground: "",
  nextGoal: "wechat",
};

export default function ObjectionFollowupForm({ isLoading, clientRefreshKey, onSubmit }: Props) {
  const [form, setForm] = useState<ObjectionFollowupData>(EMPTY_FORM);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    setClientsLoading(true);
    fetch("/api/clients")
      .then((r) => r.ok ? r.json() : [])
      .then(setClients)
      .catch((err) => { console.error("[ObjectionFollowupForm] clients load error:", err); })
      .finally(() => setClientsLoading(false));
  }, [clientRefreshKey]);

  const update = (key: keyof ObjectionFollowupData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    const customerWords = form.customerWords.trim();
    if (!customerWords) {
      alert("请填写客户原话");
      return;
    }
    onSubmit({ ...form, customerWords }, selectedClientId);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-gray-100 shrink-0">
        <h2 className="text-base font-semibold text-gray-800">客户卡点跟进</h2>
        <p className="text-xs text-gray-400 mt-1">面谈后或跟进前，复盘客户卡点并准备下一次怎么说。</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">关联客户 <span className="text-gray-400 font-normal">可选</span></label>
          <select
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm"
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
            disabled={clientsLoading}
          >
            <option value="">不关联客户</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">客户原话 <span className="text-red-400">*</span></label>
          <textarea
            className="w-full h-28 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm resize-none"
            placeholder="例如：我再考虑一下 / 太贵了 / 我回去跟家人商量 / 别家收益更高"
            value={form.customerWords}
            onChange={(e) => update("customerWords", e.target.value)}
            maxLength={800}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">当时场景</label>
          <select
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm"
            value={form.scenario}
            onChange={(e) => update("scenario", e.target.value as ObjectionFollowupScenario)}
          >
            {Object.entries(OBJECTION_SCENARIO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">我的回应 <span className="text-gray-400 font-normal">可选</span></label>
          <textarea
            className="w-full h-24 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm resize-none"
            placeholder="例如：我当时继续讲了产品收益，客户没有接话"
            value={form.agentReply || ""}
            onChange={(e) => update("agentReply", e.target.value)}
            maxLength={800}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">客户背景 <span className="text-gray-400 font-normal">可选</span></label>
          <textarea
            className="w-full h-24 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm resize-none"
            placeholder="例如：35岁，互联网从业，已有百万医疗，最近刚有二胎"
            value={form.customerBackground || ""}
            onChange={(e) => update("customerBackground", e.target.value)}
            maxLength={800}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">下一步想做什么</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(OBJECTION_GOAL_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update("nextGoal", value as ObjectionFollowupGoal)}
                className={`px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  form.nextGoal === value
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={submit}
          disabled={isLoading}
          className="w-full px-6 py-2.5 bg-brand-gradient text-white font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 text-sm"
        >
          {isLoading ? "AI 正在分析卡点..." : "生成跟进建议"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Web work mode state in `src/app/page.tsx`**

Import the form and types:

```tsx
import ObjectionFollowupForm from "@/components/ObjectionFollowupForm";
import type { CoachMode, KYCFormData, Message, ObjectionFollowupData } from "@/types";
```

Add state:

```tsx
const [workMode, setWorkMode] = useState<CoachMode>("objection_followup");
```

- [ ] **Step 3: Make `doFetch` mode-aware**

Change:

```tsx
const doFetch = async (question: string, history: Message[] = []) => {
```

to:

```tsx
const doFetch = async (
  question: string,
  history: Message[] = [],
  options: { mode?: CoachMode; objectionFollowup?: ObjectionFollowupData; clientId?: number | null } = {},
) => {
```

Inside the request body, replace:

```tsx
clientId: clientIdRef.current,
conversationId: history.length > 0 ? conversationId : null,
```

with:

```tsx
clientId: options.clientId !== undefined ? options.clientId : clientIdRef.current,
conversationId: history.length > 0 ? conversationId : null,
mode: options.mode || "diagnosis",
objectionFollowup: options.objectionFollowup,
```

- [ ] **Step 4: Add a Web objection submit handler**

Add this function in `src/app/page.tsx` near `handleSubmit`:

```tsx
const handleObjectionSubmit = async (data: ObjectionFollowupData, clientId: number | null) => {
  clientIdRef.current = clientId;
  formDataRef.current = null;
  setIsLoading(true);
  setHasSubmitted(true);
  setMessages([]);
  setConversationId(null);
  setCurrentStreamingContent("");
  setSuggestedQuestions([]);
  setMobileTab("coach");

  const question = `客户卡点跟进：${data.customerWords}`;
  try {
    const content = await doFetch(question, [], {
      mode: "objection_followup",
      objectionFollowup: data,
      clientId,
    });
    const ts = Date.now();
    const displayContent = await processResponse(content);
    setMessages([
      { role: "user", content: question, timestamp: ts },
      { role: "coach", content: displayContent, timestamp: ts + 1 },
    ]);
    setSuggestedQuestions(parseSuggestedQuestions(content));
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    if ((e as Error).message === "积分不足" || (e as Error).message === "未登录") return;
    setMessages([{ role: "coach", content: "抱歉，发生了错误，请稍后重试。", timestamp: Date.now() }]);
  } finally {
    setIsLoading(false);
    setCurrentStreamingContent("");
  }
};
```

- [ ] **Step 5: Add the Web mode switch**

Replace the mobile labels `信息填写` and `教练指导` with mode-aware text:

```tsx
{workMode === "objection_followup" ? "卡点跟进" : "信息填写"}
```

Inside the left column before the form rendering, add:

```tsx
<div className="bg-white border-b border-gray-100 px-3 md:px-4 py-3">
  <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-xl p-1">
    <button
      type="button"
      onClick={() => setWorkMode("objection_followup")}
      className={`py-2 text-sm font-medium rounded-lg transition-colors ${
        workMode === "objection_followup" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500"
      }`}
    >
      客户卡点跟进
    </button>
    <button
      type="button"
      onClick={() => setWorkMode("diagnosis")}
      className={`py-2 text-sm font-medium rounded-lg transition-colors ${
        workMode === "diagnosis" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500"
      }`}
    >
      完整诊断
    </button>
  </div>
</div>
```

Then render:

```tsx
{workMode === "objection_followup" ? (
  <ObjectionFollowupForm
    onSubmit={handleObjectionSubmit}
    isLoading={isLoading}
    clientRefreshKey={clientRefreshKey}
  />
) : (
  <KYCWizard
    onSubmit={handleSubmit}
    isLoading={isLoading}
    clientRefreshKey={clientRefreshKey}
    initialClientId={initialClientId}
  />
)}
```

- [ ] **Step 6: Make CoachPanel empty state mode-aware**

Add props in `src/components/CoachPanel.tsx`:

```tsx
modeLabel?: string;
emptyTitle?: string;
emptyHint?: string;
```

Use them in the title and empty state:

```tsx
<h2 className="text-sm font-semibold text-gray-800">{modeLabel || "教练指导区"}</h2>
```

Replace the empty state texts with:

```tsx
<p className="text-sm font-medium text-gray-400">{emptyTitle || "请填写客户信息并提交"}</p>
<p className="text-xs text-gray-300 mt-1.5">{emptyHint || "教练将在此生成诊断和推演方案"}</p>
```

Pass these props from `src/app/page.tsx`:

```tsx
modeLabel={workMode === "objection_followup" ? "客户卡点跟进" : "教练指导区"}
emptyTitle={workMode === "objection_followup" ? "填写客户卡点后生成跟进建议" : "请填写客户信息并提交"}
emptyHint={workMode === "objection_followup" ? "适合面谈后、微信前、电话前使用" : "教练将在此生成诊断和推演方案"}
```

- [ ] **Step 7: Run type check**

Run:

```bash
npm run lint
```

Expected: command exits with code `0`.

- [ ] **Step 8: Commit Web UI**

Run:

```bash
git add src/components/ObjectionFollowupForm.tsx src/app/page.tsx src/components/CoachPanel.tsx
git commit -m "feat: add web objection followup entry"
```

## Task 4: Mini Program Customer Objection Followup Entry

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`
- Test: `npm run lint && npm run build`

- [ ] **Step 1: Add Mini Program constants and state**

Near `QUICK_FIELDS` in `miniprogram/pages/coach/coach.js`, add:

```js
var OBJECTION_SCENARIOS = [
  { value: "after_meeting", label: "面谈后复盘" },
  { value: "before_wechat", label: "微信跟进前" },
  { value: "before_call", label: "电话跟进前" },
  { value: "before_next_meeting", label: "下次见面前" },
];

var OBJECTION_GOALS = [
  { value: "wechat", label: "发微信" },
  { value: "call", label: "打电话" },
  { value: "next_meeting", label: "约下次见面" },
  { value: "pause", label: "暂缓观察" },
];

var EMPTY_OBJECTION_FORM = {
  customerWords: "",
  scenario: "after_meeting",
  agentReply: "",
  customerBackground: "",
  nextGoal: "wechat",
};
```

In `data`, add:

```js
workMode: "objection_followup",
objectionScenarios: OBJECTION_SCENARIOS,
objectionGoals: OBJECTION_GOALS,
objectionScenarioLabel: "面谈后复盘",
objectionForm: JSON.parse(JSON.stringify(EMPTY_OBJECTION_FORM)),
```

- [ ] **Step 2: Let stream requests pass mode payload**

Change:

```js
var { kycData, question, history, clientId, conversationId } = params;
```

to:

```js
var { kycData, question, history, clientId, conversationId, mode, objectionFollowup } = params;
```

Add to the request `data` object:

```js
mode: mode || "diagnosis",
objectionFollowup: objectionFollowup || null,
```

- [ ] **Step 3: Add work mode and objection form handlers**

Add these page methods before `submitForm`:

```js
switchWorkMode(e) {
  var mode = e.currentTarget.dataset.mode;
  this.setData({ workMode: mode });
},

onObjectionFieldChange(e) {
  var key = e.currentTarget.dataset.key;
  var val = e.detail.value !== undefined ? e.detail.value : e.currentTarget.dataset.val;
  var data = {};
  data["objectionForm." + key] = val;
  this.setData(data);
},

onObjectionScenarioChange(e) {
  var idx = Number(e.detail.value);
  var item = this.data.objectionScenarios[idx];
  if (item) {
    this.setData({
      "objectionForm.scenario": item.value,
      objectionScenarioLabel: item.label,
    });
  }
},

selectObjectionGoal(e) {
  this.setData({ "objectionForm.nextGoal": e.currentTarget.dataset.value });
},

submitObjectionFollowup() {
  var self = this;
  if (!self.data.isLoggedIn) {
    self.handleWechatLogin();
    return;
  }
  var form = self.data.objectionForm;
  if (!form.customerWords || !form.customerWords.trim()) {
    wx.showToast({ title: "请填写客户原话", icon: "none" });
    return;
  }
  if (self.data.isLoading) return;

  var userMsg = {
    role: "user",
    content: "客户卡点跟进：" + form.customerWords.trim(),
    timestamp: Date.now(),
  };
  var placeholderMsg = {
    role: "coach",
    content: "",
    timestamp: Date.now() + 1,
    streaming: true,
  };

  self.setData({
    messages: [userMsg, placeholderMsg],
    hasSubmitted: true,
    tab: "coach",
    isLoading: true,
    conversationId: null,
    lastPointCost: null,
  });
  self._startLoadingText();

  self.streamCoachRequest({
    kycData: {},
    question: userMsg.content,
    history: [],
    clientId: self.data.selectedClientId || null,
    conversationId: null,
    mode: "objection_followup",
    objectionFollowup: {
      customerWords: form.customerWords.trim(),
      scenario: form.scenario,
      agentReply: form.agentReply || "",
      customerBackground: form.customerBackground || "",
      nextGoal: form.nextGoal,
    },
  }).then(function () {
    self.loadBalance();
  }).catch(function (err) {
    console.error("[coach] submitObjectionFollowup:", err);
    wx.showToast({ title: err.message || "生成失败，请重试", icon: "none" });
  });
},
```

- [ ] **Step 4: Add the Mini Program work-mode switch and form**

In `miniprogram/pages/coach/coach.wxml`, inside `<view class="form-area" wx:if="{{tab === 'form'}}">` and before the quick-mode toggle, add:

```xml
<view class="work-mode-switch">
  <view class="work-mode-item {{workMode === 'objection_followup' ? 'active' : ''}}" data-mode="objection_followup" bindtap="switchWorkMode">客户卡点跟进</view>
  <view class="work-mode-item {{workMode === 'diagnosis' ? 'active' : ''}}" data-mode="diagnosis" bindtap="switchWorkMode">完整诊断</view>
</view>

<view class="objection-card" wx:if="{{workMode === 'objection_followup'}}">
  <view class="objection-title">客户卡点跟进</view>
  <view class="objection-subtitle">适合面谈后、微信跟进前、电话跟进前使用。</view>

  <view class="field">
    <view class="label">客户原话<text class="required">*</text></view>
    <textarea class="textarea" value="{{objectionForm.customerWords}}" data-key="customerWords" bindinput="onObjectionFieldChange" placeholder="例如：我再考虑一下 / 太贵了 / 我回去跟家人商量" auto-height maxlength="800" />
  </view>

  <view class="field">
    <view class="label">当时场景</view>
    <picker mode="selector" range="{{objectionScenarios}}" range-key="label" bindchange="onObjectionScenarioChange">
      <view class="picker-display">
        <text>{{objectionScenarioLabel}}</text>
        <text class="picker-arrow">▼</text>
      </view>
    </picker>
  </view>

  <view class="field">
    <view class="label">我的回应<text class="tag optional-tag">可选</text></view>
    <textarea class="textarea" value="{{objectionForm.agentReply}}" data-key="agentReply" bindinput="onObjectionFieldChange" placeholder="例如：我继续讲了产品收益，客户没有接话" auto-height maxlength="800" />
  </view>

  <view class="field">
    <view class="label">客户背景<text class="tag optional-tag">可选</text></view>
    <textarea class="textarea" value="{{objectionForm.customerBackground}}" data-key="customerBackground" bindinput="onObjectionFieldChange" placeholder="例如：35岁，互联网从业，已有百万医疗，最近刚有二胎" auto-height maxlength="800" />
  </view>

  <view class="field">
    <view class="label">下一步想做什么</view>
    <view class="goal-grid">
      <view class="goal-item {{objectionForm.nextGoal === item.value ? 'active' : ''}}" wx:for="{{objectionGoals}}" wx:key="value" data-value="{{item.value}}" bindtap="selectObjectionGoal">{{item.label}}</view>
    </view>
  </view>

  <button class="btn-primary submit-btn" bindtap="submitObjectionFollowup" disabled="{{isLoading}}" loading="{{isLoading}}">
    {{isLoading ? 'AI 正在分析卡点...' : '生成跟进建议'}}
  </button>
</view>
```

Then wrap the existing quick-mode toggle and existing KYC form blocks with:

```xml
<block wx:if="{{workMode === 'diagnosis'}}">
  <!-- existing quick-mode toggle and diagnosis form stay here -->
</block>
```

- [ ] **Step 5: Add Mini Program styles**

Append to `miniprogram/pages/coach/coach.wxss`:

```css
.work-mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8rpx;
  padding: 8rpx;
  margin: 0 12rpx 20rpx;
  background: #f3f4f6;
  border-radius: 16rpx;
}
.work-mode-item {
  text-align: center;
  padding: 18rpx 8rpx;
  font-size: 26rpx;
  color: #6b7280;
  border-radius: 12rpx;
}
.work-mode-item.active {
  background: #fff;
  color: #1a56db;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
}
.objection-card {
  margin: 0 12rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.objection-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111827;
}
.objection-subtitle {
  margin-top: 8rpx;
  margin-bottom: 24rpx;
  font-size: 24rpx;
  color: #9ca3af;
}
.goal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.goal-item {
  text-align: center;
  padding: 18rpx 8rpx;
  border: 1px solid #e5e7eb;
  border-radius: 12rpx;
  color: #4b5563;
  font-size: 26rpx;
}
.goal-item.active {
  border-color: #1a56db;
  background: #e8f0fe;
  color: #1a56db;
  font-weight: 600;
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit with code `0`.

- [ ] **Step 7: Commit Mini Program UI**

Run:

```bash
git add miniprogram/pages/coach/coach.js miniprogram/pages/coach/coach.wxml miniprogram/pages/coach/coach.wxss
git commit -m "feat: add mini program objection followup entry"
```

## Task 5: Regression Checks And Release Verification

**Files:**
- Modify: `scripts/check-security-regressions.mjs`
- Test: `npm run check:security && npm run lint && npm run build`

- [ ] **Step 1: Add static regression assertions**

Append to `scripts/check-security-regressions.mjs`:

```js
assert(
  coachRoute.includes("objection_followup"),
  "coach route should support explicit objection followup mode",
);
assert(
  coachRoute.includes("buildObjectionModeInstructions"),
  "coach route should apply objection followup mode instructions",
);
assert(
  coachRoute.includes("detectInjection(userInput)"),
  "coach route should keep prompt injection detection on mode-generated input",
);

const miniCoach = read("miniprogram/pages/coach/coach.js");
assert(
  miniCoach.includes("submitObjectionFollowup"),
  "mini program should expose customer objection followup submission",
);
assert(
  miniCoach.includes("mode: \"objection_followup\""),
  "mini program should send explicit objection followup mode",
);
```

- [ ] **Step 2: Run the full verification gate**

Run:

```bash
npm run check:security
npm run lint
npm run build
```

Expected:

```text
OK coach route should support explicit objection followup mode
OK coach route should apply objection followup mode instructions
OK coach route should keep prompt injection detection on mode-generated input
OK mini program should expose customer objection followup submission
OK mini program should send explicit objection followup mode
```

The TypeScript and Next build commands exit with code `0`.

- [ ] **Step 3: Manual smoke test the local Web flow**

Run the dev server:

```bash
npm run dev
```

Open the local app and verify:

- The left side defaults to “客户卡点跟进”.
- Submitting `客户原话 = 我考虑一下` and `下一步想做什么 = 发微信` reaches the coach panel.
- The AI output contains these five headings:
  - `客户真实卡点`
  - `现在先别做什么`
  - `下一次跟进怎么说`
  - `客户继续拖延时怎么接`
  - `教练拆解`

- [ ] **Step 4: Manual smoke test Mini Program code path**

Use WeChat Developer Tools to open:

```text
/Users/fanjiahao/Documents/保险ai教练/baojiaolian/miniprogram
```

Verify:

- “客户卡点跟进” appears inside the coach page.
- Required validation fires when customer words are empty.
- Submitting `我回去跟家人商量` streams a response into the existing coach chat area.
- The existing “完整诊断” path still shows the original quick/full KYC form.

- [ ] **Step 5: Commit verification script**

Run:

```bash
git add scripts/check-security-regressions.mjs
git commit -m "test: cover objection followup regressions"
```

## Task 6: Production Release Handoff

**Files:**
- No source files beyond prior tasks.
- Test: production endpoint smoke checks after deployment.

- [ ] **Step 1: Check final Git status**

Run:

```bash
git status --short
```

Expected: only intentional changes for this feature are present. Existing unrelated local changes must not be reverted.

- [ ] **Step 2: Run final local gate**

Run:

```bash
npm run check:security
npm run lint
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 3: Deploy backend/Web to Vercel production**

Run:

```bash
vercel --prod
```

Capture:

- production domain
- deployment URL
- deployment id
- deployment status

- [ ] **Step 4: Verify production endpoints**

Run:

```bash
curl -fsS https://baojiaolian.com.cn/api/payment/packages
curl -i https://baojiaolian.com.cn/api/auth/me
```

Expected:

- `/api/payment/packages` returns package JSON.
- `/api/auth/me` returns `401` for anonymous requests with security headers.

- [ ] **Step 5: Mini Program handoff**

Because `miniprogram/pages/coach/*` changes are part of this feature, Vercel deployment is not enough. Hand off these exact steps to the user:

```text
1. Open WeChat Developer Tools.
2. Open /Users/fanjiahao/Documents/保险ai教练/baojiaolian/miniprogram.
3. Confirm the backend domain is https://baojiaolian.com.cn.
4. Upload a new mini program version.
5. Submit for WeChat review.
```

## Self-Review

- Spec coverage: The plan covers the in-page entrance, compact inputs, five-part output, no-client save behavior, existing auth/points/conversation reuse, Web and Mini Program support, and security verification.
- Scope check: The plan does not implement AI role-play, team scoring, customer-stage management, or full knowledge-base refactoring.
- Placeholder scan: The plan contains no unspecified implementation steps; all code-writing steps include concrete snippets and commands.
- Type consistency: `CoachMode`, `ObjectionFollowupData`, `ObjectionFollowupScenario`, and `ObjectionFollowupGoal` are introduced in Task 1 and reused consistently in later tasks.
