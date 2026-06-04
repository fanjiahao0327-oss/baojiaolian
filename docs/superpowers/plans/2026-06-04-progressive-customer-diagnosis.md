# Progressive Customer Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quick/deep customer diagnosis toggle with a single progressive customer diagnosis form.

**Architecture:** Keep the existing diagnosis API contract and mini program `formData` structure. Change only the mini program rendering and submission data shaping so core fields are always visible and supplemental KYC fields are optional.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JavaScript, existing Node regression script.

---

### Task 1: Add Regression Checks

**Files:**
- Modify: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Update assertions**

Require `补充更多客户信息`, `showDeepDiagnosisFields`, and `DIAGNOSIS_SUPPLEMENT_SECTIONS`. Reject `quick-mode-toggle`, `toggleQuickMode`, and `深度诊断`.

- [ ] **Step 2: Verify red**

Run `npm run check:security`. Expected result: failure on the new progressive diagnosis assertions.

### Task 2: Refactor Mini Program Diagnosis Form

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`

- [ ] **Step 1: Add supplemental sections**

Build `DIAGNOSIS_SUPPLEMENT_SECTIONS` from the existing KYC sections by excluding quick fields. Add `showDeepDiagnosisFields` and `toggleDeepDiagnosisFields`.

- [ ] **Step 2: Remove the quick/deep switch**

Delete the visible quick/deep toggle and remove the full 6-step diagnosis branch from the diagnosis screen. Render core fields first, then the optional supplemental section.

- [ ] **Step 3: Include optional fields in diagnosis**

Keep validating only `QUICK_REQUIRED_FIELDS`, but include every non-empty `formData` field in the KYC snapshot and prompt.

### Task 3: Verify And Release

**Files:**
- No new implementation files.

- [ ] **Step 1: Run verification**

Run:

```bash
npm run check:security
node --check miniprogram/pages/coach/coach.js
npm run lint
npm run build
git diff --check
```

- [ ] **Step 2: Commit**

Commit the spec, plan, regression checks, and mini program changes.

- [ ] **Step 3: Deployment decision**

If only `miniprogram/` and docs/check scripts changed, no Vercel deployment is required. Tell the user to upload the mini program through WeChat Developer Tools.
