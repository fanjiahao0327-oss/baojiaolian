# Knowledge Base Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the AI insurance coach knowledge base into modular files, add high-value critical illness and savings/dividend modules, and improve module selection without changing mini program UI.

**Architecture:** Keep `@/lib/knowledge` as the public import path by turning `src/lib/knowledge.ts` into a compatibility re-export. Move the real implementation into `src/lib/knowledge/`, where `types.ts` defines metadata, content files export modules, `selector.ts` scores topics from KYC plus user input, and `index.ts` exposes the old API.

**Tech Stack:** Next.js TypeScript API route, static regression script `scripts/check-security-regressions.mjs`, existing `npm run check:security`, `npm run lint`, `npm run build`, and Vercel production deployment.

---

### Task 1: Regression Checks For Modular Knowledge

**Files:**
- Modify: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Write failing architecture checks**

Add checks after `const coachRoute = read("src/app/api/coach/route.ts");`:

```js
const knowledgeRoot = "src/lib/knowledge";
const knowledgeIndex = read("src/lib/knowledge/index.ts");
const knowledgeTypes = read("src/lib/knowledge/types.ts");
const knowledgeSelector = read("src/lib/knowledge/selector.ts");
const criticalIllnessKnowledge = read("src/lib/knowledge/products-critical-illness.ts");
const savingsDividendKnowledge = read("src/lib/knowledge/products-savings-dividend.ts");
const legacyKnowledge = read("src/lib/knowledge.ts");

assert(
  knowledgeTypes.includes("sourceRefs") &&
    knowledgeTypes.includes("KnowledgeTopic") &&
    knowledgeTypes.includes("KnowledgeMode"),
  "knowledge modules should expose topic, mode, and internal source metadata",
);
assert(
  legacyKnowledge.includes("export * from \"./knowledge\""),
  "legacy knowledge import path should re-export the modular knowledge index",
);
assert(
  knowledgeSelector.includes("detectKnowledgeTopics") &&
    knowledgeSelector.includes("selectModules") &&
    knowledgeSelector.includes("selectModulesForFollowUp"),
  "knowledge selector should expose topic detection and preserve public selection APIs",
);
assert(
  criticalIllnessKnowledge.includes("critical_illness_positioning") &&
    criticalIllnessKnowledge.includes("medical_vs_ci_cashflow") &&
    criticalIllnessKnowledge.includes("premium_inversion_objection"),
  "critical illness knowledge should include positioning, cashflow, and premium inversion modules",
);
assert(
  savingsDividendKnowledge.includes("dividend_interest_rate_shift") &&
    savingsDividendKnowledge.includes("education_retirement_visualization") &&
    savingsDividendKnowledge.includes("appropriation_interest_usage_risks"),
  "savings and dividend knowledge should include rate shift, visualization, and risk modules",
);
assert(
  knowledgeSelector.includes("critical_illness") &&
    knowledgeSelector.includes("dividend") &&
    knowledgeSelector.includes("retirement") &&
    knowledgeSelector.includes("inheritance"),
  "knowledge selector should score critical illness, dividend, retirement, and inheritance topics",
);
assert(
  knowledgeIndex.includes("COACH_KNOWLEDGE_BASE") &&
    knowledgeIndex.includes("ALL_MODULES"),
  "knowledge index should preserve compatibility exports",
);
```

Run: `npm run check:security`

Expected: FAIL because `src/lib/knowledge/` files do not exist yet.

- [ ] **Step 2: Commit only if the failing checks are in place**

Do not commit after Step 1. Continue to Task 2 and commit the red-green slice together once checks pass.

### Task 2: Modular Knowledge Structure And Compatibility

**Files:**
- Create: `src/lib/knowledge/types.ts`
- Create: `src/lib/knowledge/core.ts`
- Create: `src/lib/knowledge/methods.ts`
- Create: `src/lib/knowledge/objections.ts`
- Create: `src/lib/knowledge/cases.ts`
- Create: `src/lib/knowledge/selector.ts`
- Create: `src/lib/knowledge/index.ts`
- Modify: `src/lib/knowledge.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Create `types.ts`**

Create:

```ts
import type { CoachMode } from "@/types";

export type ModuleTier = "core" | "method" | "product" | "objection" | "case" | "reference";

export type KnowledgeTopic =
  | "flow"
  | "role"
  | "market"
  | "client_tier"
  | "social"
  | "call_invite"
  | "need_discovery"
  | "need_intensify"
  | "solution_gap"
  | "critical_illness"
  | "medical"
  | "savings"
  | "dividend"
  | "education"
  | "retirement"
  | "inheritance"
  | "objection"
  | "case_review";

export type KnowledgeMode = CoachMode | "all";

export interface KnowledgeModule {
  id: string;
  title: string;
  tier: ModuleTier;
  topics: KnowledgeTopic[];
  modes: KnowledgeMode[];
  sourceRefs: string[];
  content: string;
}
```

- [ ] **Step 2: Create core and method modules**

Move the existing core and method content from `src/lib/knowledge.ts` into:

- `src/lib/knowledge/core.ts`: `M000_FLOW`, `M001_ROLE`, `M002_MARKET_SHIFT`, `M003_CLIENT_TIER`, `M004_SOCIAL`, `M005_CALL_INVITE`
- `src/lib/knowledge/methods.ts`: `M006_NEED_DISCOVERY`, `M007_NEED_INTENSIFY`, `M008_SOLUTION_GAP`

Each module should now include `topics`, `modes`, and `sourceRefs`.

- [ ] **Step 3: Create objection and case modules**

Move existing objection and case content into:

- `src/lib/knowledge/objections.ts`: `M010_OBJECTION`, `M012_DRG_MEDICAL`
- `src/lib/knowledge/cases.ts`: `M011_CASE_REVIEW`

Use `tier: "objection"` for objection modules and `tier: "case"` for case review.

- [ ] **Step 4: Create selector**

Create `src/lib/knowledge/selector.ts` with:

```ts
import type { CoachMode, KYCFormData } from "@/types";
import type { KnowledgeModule, KnowledgeTopic } from "./types";
import { CORE_MODULES, REFERENCE_MODULES } from "./core";
import { METHOD_MODULES } from "./methods";
import { OBJECTION_MODULES } from "./objections";
import { CASE_MODULES } from "./cases";

const MAX_REFERENCE_MODULES = 4;

function textIncludes(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function detectKnowledgeTopics(
  kycData: KYCFormData | null | undefined,
  userInput = "",
): Set<KnowledgeTopic> {
  const d = (kycData || {}) as KYCFormData;
  const text = [
    userInput,
    d.triggerScenario,
    d.clientOriginalWords,
    d.clientObjection,
    d.agentResponse,
    d.pastInteraction,
    d.protectionInsurance,
    d.savingsInsurance,
    d.otherInsurance,
    d.insuranceAttitude,
    d.childrenDetail,
    d.parentsDetail,
    d.majorExpensePlan,
    d.fixedAssets,
    d.investmentStyle,
    d.riskTolerance,
  ].filter(Boolean).join(" ");
  const topics = new Set<KnowledgeTopic>();

  if (textIncludes(text, ["重疾", "大病", "身体", "康复", "康养", "核保", "保额", "保费倒挂"])) topics.add("critical_illness");
  if (textIncludes(text, ["医疗险", "百万医疗", "补充医疗", "DRG", "特需", "国际部", "外购药"])) topics.add("medical");
  if (textIncludes(text, ["储蓄", "年金", "现金流", "长期规划", "存不下来"])) topics.add("savings");
  if (textIncludes(text, ["分红", "红利", "收益", "利率", "预定利率", "开门红"])) topics.add("dividend");
  if (textIncludes(text, ["教育", "留学", "国际学校", "小升初", "孩子"])) topics.add("education");
  if (textIncludes(text, ["养老", "退休", "旅居", "养老社区", "护理"])) topics.add("retirement");
  if (textIncludes(text, ["传承", "婚姻", "债务", "留钱", "子女"])) topics.add("inheritance");
  if (textIncludes(text, ["考虑", "家人商量", "太贵", "没钱", "没预算", "交不上", "不划算", "比较"])) topics.add("objection");

  if (d.clientObjection && d.clientObjection.trim()) topics.add("objection");
  if (d.childrenDetail || d.majorExpensePlan) topics.add("education");
  if (d.parentsDetail) topics.add("retirement");
  if (d.savingsInsurance || d.investmentAmount || d.liquidAssets || d.fixedAssets) topics.add("savings");

  return topics;
}

function modeScore(module: KnowledgeModule, mode: CoachMode): number {
  return module.modes.includes("all") || module.modes.includes(mode) ? 2 : 0;
}

function topicScore(module: KnowledgeModule, topics: Set<KnowledgeTopic>): number {
  return module.topics.reduce((score, topic) => score + (topics.has(topic) ? 5 : 0), 0);
}

function selectReferenceModules(
  kycData: KYCFormData | null | undefined,
  mode: CoachMode,
  userInput = "",
): KnowledgeModule[] {
  const topics = detectKnowledgeTopics(kycData, userInput);
  const modules = [...REFERENCE_MODULES, ...OBJECTION_MODULES, ...CASE_MODULES];
  const scored = modules
    .map((module) => ({ module, score: modeScore(module, mode) + topicScore(module, topics) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_REFERENCE_MODULES).map((entry) => entry.module);
}

export function selectModules(
  kycData: KYCFormData | null | undefined,
  mode: CoachMode = "diagnosis",
  userInput = "",
): KnowledgeModule[] {
  return [...CORE_MODULES, ...METHOD_MODULES, ...selectReferenceModules(kycData, mode, userInput)];
}

export function selectModulesForFollowUp(
  kycData?: KYCFormData | null,
  mode: CoachMode = "diagnosis",
  userInput = "",
): KnowledgeModule[] {
  return [...CORE_MODULES, ...selectReferenceModules(kycData, mode, userInput).slice(0, 2)];
}
```

- [ ] **Step 5: Create index and legacy re-export**

Create `src/lib/knowledge/index.ts`:

```ts
export type { KnowledgeMode, KnowledgeModule, KnowledgeTopic, ModuleTier } from "./types";
export { CORE_MODULES, REFERENCE_MODULES } from "./core";
export { METHOD_MODULES } from "./methods";
export { OBJECTION_MODULES } from "./objections";
export { CASE_MODULES } from "./cases";
export { detectKnowledgeTopics, selectModules, selectModulesForFollowUp } from "./selector";

import { CORE_MODULES, REFERENCE_MODULES } from "./core";
import { METHOD_MODULES } from "./methods";
import { OBJECTION_MODULES } from "./objections";
import { CASE_MODULES } from "./cases";

export const ALL_MODULES = [
  ...CORE_MODULES,
  ...METHOD_MODULES,
  ...REFERENCE_MODULES,
  ...OBJECTION_MODULES,
  ...CASE_MODULES,
];

export const COACH_KNOWLEDGE_BASE = ALL_MODULES.map((m) => m.content).join("\n---\n");
```

Replace `src/lib/knowledge.ts` with:

```ts
export * from "./knowledge";
```

- [ ] **Step 6: Verify compatibility**

Run:

```bash
npm run check:security
npm run lint
```

Expected: `check:security` still fails only for missing product module checks from Task 3; TypeScript passes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/knowledge.ts src/lib/knowledge scripts/check-security-regressions.mjs
git commit -m "refactor: modularize coach knowledge base"
```

### Task 3: Product Knowledge Enhancements

**Files:**
- Create: `src/lib/knowledge/products-critical-illness.ts`
- Create: `src/lib/knowledge/products-savings-dividend.ts`
- Modify: `src/lib/knowledge/index.ts`
- Modify: `src/lib/knowledge/selector.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Add critical illness modules**

Create modules with IDs:

- `critical_illness_positioning`
- `medical_vs_ci_cashflow`
- `ci_motivation_discovery`
- `ci_sum_assured_generation`
- `premium_inversion_objection`

The content must cover:

- 重疾险是保险基本功，不是储蓄险时代就可以忽略。
- 重疾险重点解决收入中断和康养现金流，医疗险解决发票内治疗费用。
- 主动咨询重疾险时用积极导向确认身体担心。
- 非主动咨询时先敲身体状态，不恐吓。
- 保额由客户自己根据收入损失和康养费算出来。
- 保费倒挂用长轴图和主动权解释，不制造恐惧。

- [ ] **Step 2: Add savings/dividend modules**

Create modules with IDs:

- `dividend_interest_rate_shift`
- `savings_goal_discovery`
- `education_retirement_visualization`
- `savings_solution_gap`
- `appropriation_interest_usage_risks`
- `inheritance_marriage_debt_risks`

The content must cover:

- 731 后不能只靠固定利率卖法。
- 分红险讲功能和适配，不承诺收益。
- 教育金、养老金先聊画面感，再做预期管理。
- 储蓄类保险是现有方式的补足方案，不批评客户投资或存钱方式。
- 挪用风险、利率下行风险、使用期风险、护理缺口。
- 婚姻和债务风险只做温和探问，不制造冲突。

- [ ] **Step 3: Register product modules**

Update `src/lib/knowledge/index.ts` to export:

```ts
export { CRITICAL_ILLNESS_MODULES } from "./products-critical-illness";
export { SAVINGS_DIVIDEND_MODULES } from "./products-savings-dividend";
```

Add both arrays to `ALL_MODULES`.

Update `src/lib/knowledge/selector.ts` to import them and include them in scored modules:

```ts
import { CRITICAL_ILLNESS_MODULES } from "./products-critical-illness";
import { SAVINGS_DIVIDEND_MODULES } from "./products-savings-dividend";

const modules = [
  ...REFERENCE_MODULES,
  ...CRITICAL_ILLNESS_MODULES,
  ...SAVINGS_DIVIDEND_MODULES,
  ...OBJECTION_MODULES,
  ...CASE_MODULES,
];
```

- [ ] **Step 4: Verify product module checks**

Run:

```bash
npm run check:security
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/knowledge scripts/check-security-regressions.mjs
git commit -m "feat: add product knowledge modules"
```

### Task 4: Coach Route Uses Mode And User Input For Selection

**Files:**
- Modify: `src/app/api/coach/route.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Add failing route selection check**

Add to `scripts/check-security-regressions.mjs`:

```js
assert(
  coachRoute.includes("selectModules(safeKycData as unknown as KYCFormData, mode, effectiveQuestion)") &&
    coachRoute.includes("selectModulesForFollowUp(safeKycData as unknown as KYCFormData, mode, effectiveQuestion)"),
  "coach route should pass mode and user input into knowledge selection",
);
```

Run: `npm run check:security`

Expected: FAIL because the route still calls the old two-argument-free selector.

- [ ] **Step 2: Pass mode and user input**

Update module selection in `src/app/api/coach/route.ts`:

```ts
const modules = isFollowUp
  ? selectModulesForFollowUp(safeKycData as unknown as KYCFormData, mode, effectiveQuestion)
  : selectModules(safeKycData as unknown as KYCFormData, mode, effectiveQuestion);
```

- [ ] **Step 3: Verify**

Run:

```bash
npm run check:security
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/coach/route.ts scripts/check-security-regressions.mjs
git commit -m "feat: route coach knowledge by topic"
```

### Task 5: Full Verification And Deployment

**Files:**
- Verify all changed backend files.
- Deploy backend because `src/app/api/coach/route.ts` and knowledge modules changed.

- [ ] **Step 1: Run full local verification**

```bash
npm run check:security
node --check miniprogram/pages/coach/coach.js
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect final git state**

```bash
git status --short
git diff --check
git log --oneline -8
```

Expected: no unstaged files, no whitespace errors, recent commits show knowledge enhancement work.

- [ ] **Step 3: Deploy production backend**

```bash
vercel --prod
```

Expected: deployment status Ready and `https://baojiaolian.com.cn` aliased to the new deployment.

- [ ] **Step 4: Verify public backend**

```bash
curl -fsS https://baojiaolian.com.cn/api/payment/packages
curl -i https://baojiaolian.com.cn/api/auth/me
curl -i -X POST https://baojiaolian.com.cn/api/coach -H 'Content-Type: application/json' -d '{"mode":"diagnosis","question":"测试重疾险和分红险知识库","noStream":true}'
```

Expected: packages returns JSON; auth/me returns expected unauthenticated response; coach returns expected `401` when unauthenticated, not a server error.

- [ ] **Step 5: Final handoff**

Tell the user:

- Backend has been deployed to `https://baojiaolian.com.cn`.
- No mini program UI files changed if `git diff` confirms no `miniprogram/` changes.
- If no `miniprogram/` files changed, WeChat Developer Tools upload is not required for this phase.
