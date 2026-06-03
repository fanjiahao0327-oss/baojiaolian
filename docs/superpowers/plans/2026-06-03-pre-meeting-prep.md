# Pre Meeting Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mini-program-first “见前准备” mode so agents can generate a short pre-meeting battle card from an existing customer file plus lightweight meeting context.

**Architecture:** Add a third coach mode, `pre_meeting_prep`, alongside `diagnosis` and `objection_followup`. The backend owns validation, prompt construction, title generation, and the fixed five-section output contract; the mini program owns the lightweight form and sends stable non-streaming JSON through the existing coach request path.

**Tech Stack:** Next.js API route handlers, TypeScript shared types, existing `knowledge.ts` module selector, WeChat Mini Program JS/WXML/WXSS, existing `npm run check:security`, `npm run lint`, and `npm run build`.

---

### Task 1: Backend Mode Helpers

**Files:**
- Create: `src/lib/pre-meeting-prep.ts`
- Modify: `src/types/index.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Write the failing regression checks**

Add checks that require `pre_meeting_prep`, `buildPreMeetingPrepQuestion`, `buildPreMeetingPrepModeInstructions`, and `preMeetingPrep` support in the backend and mini program.

Run: `npm run check:security`

Expected: FAIL because these strings do not exist yet.

- [ ] **Step 2: Add shared types**

Update `src/types/index.ts`:

```ts
export type CoachMode = "diagnosis" | "objection_followup" | "pre_meeting_prep";

export type PreMeetingPurpose =
  | "first_meeting"
  | "second_meeting"
  | "policy_review"
  | "referral"
  | "existing_customer_addon"
  | "other";

export type PreMeetingGoal =
  | "build_trust"
  | "discover_needs"
  | "book_next_meeting"
  | "policy_review"
  | "solution_discussion";

export interface PreMeetingPrepData {
  meetingPurpose: PreMeetingPurpose;
  meetingBackground: string;
  knownCustomerInfo?: string;
  worryPoint?: string;
  desiredOutcome?: PreMeetingGoal;
}
```

- [ ] **Step 3: Add backend helper module**

Create `src/lib/pre-meeting-prep.ts` with exported option labels, normalize, validate, question builder, title builder, and mode instructions. The mode instructions must require five sections:

```text
1. 客户初步判断
2. 这次别急着做什么
3. 开场切入话题
4. 提问顺序
5. 可能异议预案
```

- [ ] **Step 4: Verify the helper compiles**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/pre-meeting-prep.ts scripts/check-security-regressions.mjs
git commit -m "feat: add pre meeting prep helpers"
```

### Task 2: Coach API Mode Support

**Files:**
- Modify: `src/app/api/coach/route.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Route `pre_meeting_prep` through validation**

Import helper functions from `src/lib/pre-meeting-prep.ts`. Parse `preMeetingPrep` from the request body. Normalize and validate it when `mode === "pre_meeting_prep"`. Return `400` with `请填写本次见面背景` when the required background is missing on first submit.

- [ ] **Step 2: Build the first user message**

Set `effectiveQuestion` to `buildPreMeetingPrepQuestion(prepData)` for first-submit prep mode. Preserve normal `question` for follow-ups.

- [ ] **Step 3: Build the conversation title**

For first-submit prep mode, use `buildPreMeetingPrepConversationTitle(prepData, safeKycData)`.

- [ ] **Step 4: Apply mode instructions and disable KYC update**

Use `buildPreMeetingPrepModeInstructions()` for `pre_meeting_prep`. KYC update instructions for both `objection_followup` and `pre_meeting_prep` must say not to output `[KYC_UPDATE]`.

- [ ] **Step 5: Verify route behavior with static checks**

Run: `npm run check:security`

Expected: PASS for all pre-meeting-prep checks.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/coach/route.ts scripts/check-security-regressions.mjs
git commit -m "feat: support pre meeting prep coach mode"
```

### Task 3: Mini Program Entry And Form

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Add mini program regression checks**

Require the mini program to include `preMeetingPrepForm`, `submitPreMeetingPrep`, `mode: "pre_meeting_prep"`, and the visible mode switch text `见前准备`.

Run: `npm run check:security`

Expected: FAIL before the mini program files are changed.

- [ ] **Step 2: Add page state and handlers**

Add `PREP_PURPOSE_OPTIONS`, `PREP_GOAL_OPTIONS`, `EMPTY_PREP_FORM`, `preMeetingPrepForm`, picker labels/indexes, `onPreMeetingPrepFieldChange`, `onPreMeetingPurposeChange`, `onPreMeetingGoalChange`, `submitPreMeetingPrep`, and `_doSubmitPreMeetingPrep`.

- [ ] **Step 3: Send the API payload**

`_doSubmitPreMeetingPrep` should send:

```js
self.streamCoachRequest({
  kycData: {},
  question: userContent,
  history: [],
  clientId: self.data.selectedClientId,
  conversationId: null,
  mode: "pre_meeting_prep",
  preMeetingPrep: payload,
});
```

- [ ] **Step 4: Render the form**

Add a third mode button in `coach.wxml`. When `workMode === "pre_meeting_prep"`, render a compact card with meeting purpose, meeting background, known customer info, worry point, desired outcome, and a generate button.

- [ ] **Step 5: Adjust layout for three modes**

Change `.work-mode-switch` to three columns and reuse the existing card styles for the prep form.

- [ ] **Step 6: Verify mini program syntax**

Run: `node --check miniprogram/pages/coach/coach.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add miniprogram/pages/coach/coach.js miniprogram/pages/coach/coach.wxml miniprogram/pages/coach/coach.wxss scripts/check-security-regressions.mjs
git commit -m "feat: add mini pre meeting prep form"
```

### Task 4: Verification And Release

**Files:**
- Verify all changed files.
- Deploy backend because `src/app/api/coach/route.ts` changes.

- [ ] **Step 1: Run full local verification**

```bash
npm run check:security
node --check miniprogram/pages/coach/coach.js
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Deploy production backend**

```bash
vercel --prod
```

Expected: deployment status Ready.

- [ ] **Step 3: Verify public backend**

```bash
curl -fsS https://baojiaolian.com.cn/api/payment/packages
curl -i https://baojiaolian.com.cn/api/auth/me
```

Expected: packages returns JSON; auth/me returns an authentication response without server error.

- [ ] **Step 4: Final handoff**

Tell the user that Vercel backend is deployed, but WeChat Developer Tools upload/review is still required because files under `miniprogram/` changed.
