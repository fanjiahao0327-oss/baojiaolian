# Capacity Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add protected database-capacity monitoring for the Baojiaolian admin and release workflow.

**Architecture:** The implementation adds a small server-side capacity library, an admin-only API route, a compact admin-page section, and a local CLI script. All access uses the existing `ADMIN_KEY` boundary and returns only aggregate database metadata.

**Tech Stack:** Next.js App Router, TypeScript, Neon serverless PostgreSQL, Node.js scripts, existing security regression script.

---

### Task 1: Regression Guard

**Files:**
- Modify: `scripts/check-security-regressions.mjs`

- [ ] Add assertions that `src/app/api/admin/capacity/route.ts` exists, validates `x-admin-key` with `isAdminKeyValid`, reads PostgreSQL capacity metadata, and does not contain obvious secret output.
- [ ] Add assertions that `src/app/admin/page.tsx` contains a capacity monitoring section.
- [ ] Run `npm run check:security` and confirm it fails because the capacity route has not been implemented yet.

### Task 2: Capacity Library And API

**Files:**
- Create: `src/lib/capacity.ts`
- Create: `src/app/api/admin/capacity/route.ts`

- [ ] Implement capacity helpers for parsing `DATABASE_CAPACITY_BYTES`, formatting thresholds, and reading table sizes/row counts.
- [ ] Implement a `GET /api/admin/capacity` route guarded by `x-admin-key`.
- [ ] Return only aggregate metadata and generic failure messages.

### Task 3: Admin UI

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] Add TypeScript interfaces for capacity data.
- [ ] Fetch capacity data after admin login and on refresh.
- [ ] Render a compact capacity card above the order list.
- [ ] Keep order management usable if capacity loading fails.

### Task 4: Local Capacity Script

**Files:**
- Create: `scripts/check-db-capacity.mjs`
- Modify: `package.json`

- [ ] Add a local script that queries the database with `DATABASE_URL`.
- [ ] Add `npm run capacity` to run it.
- [ ] Print current size, configured ceiling, usage percentage, status, and table-level rows/sizes.

### Task 5: Verification And Release

**Files:**
- Verify: full repo

- [ ] Run `npm run check:security`.
- [ ] Run `npm run capacity`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Deploy to Vercel production.
- [ ] Verify `https://baojiaolian.com.cn/api/admin/capacity` rejects missing admin key with `403`.
