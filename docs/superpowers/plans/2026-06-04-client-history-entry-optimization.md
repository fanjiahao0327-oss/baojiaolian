# Client History And Entry Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure lightweight coach sessions are bound to customers, visible in customer history, and presented through clearer daily-use entries.

**Architecture:** Keep the binding logic in the mini program so the user gets immediate feedback before calling the coach API. Enrich existing conversation list APIs with client ids and previews, then render recent and per-customer histories with client-side type labels.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, Next.js route handlers, existing security regression script.

---

### Task 1: Add Regression Checks

**Files:**
- Modify: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Add checks for the new behavior**

Add assertions that require lightweight auto-create binding, customer history metadata, recent coach records, and the new "客户诊断/深度诊断" labels.

- [ ] **Step 2: Run the check and verify it fails**

Run: `npm run check:security`

Expected: FAIL on the new missing assertions.

### Task 2: Bind Lightweight Sessions To Customers

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`

- [ ] **Step 1: Add lightweight client state**

Add `selectedClientName` and `lightClientName` to page data, keep them synchronized when selecting/loading a customer, and render a customer context block for the three lightweight modes.

- [ ] **Step 2: Add lightweight customer creation helper**

Add `_requireLightClientName` and `_ensureLightClientContext`. If no customer is selected, create `/api/clients` with a minimal `kycSnapshot`, then set `selectedClientId` and `selectedClientName`.

- [ ] **Step 3: Route all lightweight submits through the helper**

Update customer objection follow-up, pre-meeting prep, and meeting review submit flows so coach requests are only sent after a valid `clientId` exists.

### Task 3: Improve History Lists

**Files:**
- Modify: `src/app/api/clients/[id]/route.ts`
- Modify: `src/app/api/conversations/route.ts`
- Modify: `miniprogram/pages/clients/clients.js`
- Modify: `miniprogram/pages/clients/clients.wxml`
- Modify: `miniprogram/pages/clients/clients.wxss`
- Modify: `miniprogram/pages/coach/coach.js`

- [ ] **Step 1: Return client ids and previews**

Return `client_id`/`clientId` and `preview` from conversation list APIs. For customer detail, include a short preview parsed from the first user message.

- [ ] **Step 2: Render type labels in customer history**

Infer type labels from conversation titles or first messages and render them beside each history title.

- [ ] **Step 3: Add recent coach records**

Load `/api/conversations` on the clients page and show a "最近教练记录" section. Opening a recent record should use `app.globalData.openConversation`.

### Task 4: Rename And Simplify Diagnosis Entry

**Files:**
- Modify: `miniprogram/pages/coach/coach.wxml`

- [ ] **Step 1: Rename the top-level entry**

Change "完整诊断" to "客户诊断".

- [ ] **Step 2: Clarify the internal toggle**

Change "完整模式" to "深度诊断" and keep "快速模式" as "快速诊断".

### Task 5: Verify, Commit, And Release

**Files:**
- No new implementation files.

- [ ] **Step 1: Run local verification**

Run:

```bash
npm run check:security
node --check miniprogram/pages/coach/coach.js
node --check miniprogram/pages/clients/clients.js
npm run lint
npm run build
git diff --check
```

- [ ] **Step 2: Commit changes**

Commit the plan/spec, regression checks, and implementation in focused commits.

- [ ] **Step 3: Deploy backend if API files changed**

Run `vercel --prod`, verify `https://baojiaolian.com.cn/api/payment/packages`, and tell the user that WeChat Developer Tools upload is required because `miniprogram/` changed.
