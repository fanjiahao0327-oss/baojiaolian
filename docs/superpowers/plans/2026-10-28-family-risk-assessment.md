# AI家庭风险测评 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `baojiaolian` 仓库上，把 B 端「领展智教练」小程序改造成 C 端「AI家庭风险测评」：匿名测评 → 家庭财富平衡 5 大指数 + Top 3 → 1 元解锁完整报告 → 预约/客服。

**Architecture:** 复用现有 AppID、Next.js API、Neon、DeepSeek、微信支付；新增 `src/lib/checkup/*`（纯函数 + AI 调用）与 `src/app/api/checkup/*`；小程序重写 5 个页面；对话内容零存储，仅订单、预约、匿名事件落库。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript 6、Tailwind 4、Neon PostgreSQL、DeepSeek `deepseek-flash`（`reasoning_effort: "max"`）、微信小程序原生、微信支付 JSAPI、`tsx --test`。

---

## 0. 前置约定

- 工作目录：`/Users/fanjiahao/Documents/保险ai教练/baojiaolian`
- 设计文档：`docs/superpowers/specs/2026-10-28-family-risk-assessment-design.md`
- 分支：`feat/family-risk-checkup`（从当前 HEAD 开出）
- 旧版 tag：`legacy-b2b-coach`
- 测试：放在 `eval/checkup-*.test.ts`，`npm run test:eval` 自动跑；单测命令 `npx tsx --test eval/checkup-xxx.test.ts`
- 模型：`deepseek-flash`，已写入 `src/lib/ai-client.ts`
- 隐私：**对话内容零存储**；订单表、预约表、匿名事件表都不含对话正文
- 合规：不出现产品名/公司名/费率/收益承诺/联系方式；报告必须带免责声明
- 提交：每个 Task 一个 commit；commit message 用 `feat(checkup): ...` 或 `test(checkup): ...`

---

## 1. 阶段与验收门

| 阶段 | 任务 | 验收门 |
|---|---|---|
| P0 准备 | Task 1 | 分支/tag 建好；`lint`、`check:security`、`test:eval`、`build` 全过 |
| P1 数据与评分 | Task 2–4 | 维度、题库、5 大指数单测全过 |
| P2 会话与追问 | Task 5–8 | 家庭结构必问；6–12 轮收口；签名令牌与分诊单测全过 |
| P3 报告与合规 | Task 9–11 | 报告 JSON 结构正确；免费/完整版差异正确；合规扫描 0 红线 |
| P4 数据与接口 | Task 12–15 | 本地 curl 跑通 session→answer→preview→mock 支付→unlock→appointment |
| P5 小程序 | Task 16–21 | 微信开发者工具真机走完整链路 |
| P6 验收与发布 | Task 22–24 | lint/security/build 全过；生产接口正常；小程序上传提审 |

---

## 2. 文件地图

### 新增

```text
src/lib/checkup/
  types.ts              # 所有类型
  dimensions.ts         # 10 个维度与提问策略
  question-bank.ts      # 28 题种子题库
  indices.ts            # 5 大指数计算
  session.ts            # 无状态签名令牌
  triage.ts             # 风险域分诊
  follow-up.ts          # 下一题选择与收口
  prompts.ts            # 追问/报告 prompt
  risk-rules.ts         # 规则化风险识别
  report.ts             # 报告组装、免费/完整版
  compliance.ts         # C 端合规扫描与重写
  store.ts              # 订单/预约/事件数据访问
src/app/api/checkup/
  session/route.ts
  answer/route.ts
  preview/route.ts
  order/route.ts
  order/status/route.ts
  unlock/route.ts
  appointment/route.ts
  event/route.ts
  pay/notify/route.ts
  pay/mock/route.ts     # 仅开发环境
src/app/api/admin/checkup/
  appointments/route.ts
  stats/route.ts
miniprogram/pages/
  index/index.{js,wxml,wxss,json}
  chat/chat.{js,wxml,wxss,json}
  report/report.{js,wxml,wxss,json}
  booking/booking.{js,wxml,wxss,json}
  about/about.{js,wxml,wxss,json}
miniprogram/utils/
  storage.js
  report-image.js       # 保存长图（canvas 2D）
eval/
  checkup-dimensions.test.ts
  checkup-question-bank.test.ts
  checkup-indices.test.ts
  checkup-session.test.ts
  checkup-triage.test.ts
  checkup-followup.test.ts
  checkup-risk-rules.test.ts
  checkup-report.test.ts
  checkup-compliance.test.ts
  checkup-cases.json
  checkup-pipeline.test.ts
```

### 修改

```text
src/lib/db.ts                        # 新增 3 张表 + 索引
src/lib/wechatpay.ts                 # createJSAPIPrepay 支持自定义 notifyUrl
src/app/admin/page.tsx               # 加「测评预约」标签页
miniprogram/app.json                 # 页面、窗口配置、去掉 tabBar
miniprogram/app.js                   # 静默登录 + checkup 启动
miniprogram/utils/api.js             # checkup 接口封装
scripts/check-security-regressions.mjs # 新增 C 端回归项
package.json                         # 可选：test:checkup 脚本
```

---

## 3. 任务

### Task 1: 建分支、冻结旧版、基线验证

**Files:** 无

- [ ] **Step 1: 查看工作区**

Run:
```bash
git status --short
```
Expected: 只看到已知的 B 端 WIP 与设计文档改动。

- [ ] **Step 2: 提交当前 WIP（保留旧版合规/评测成果）**

```bash
git add -A
git commit -m "chore: checkpoint B2B coach WIP before C-end pivot"
```
Expected: commit 创建成功；确认没有 `.env`、`certs/`、`data/` 被加入（它们在 `.gitignore`）。

- [ ] **Step 3: 打 tag、开新分支**

```bash
git tag legacy-b2b-coach
git checkout -b feat/family-risk-checkup
git branch --show-current
```
Expected: 输出 `feat/family-risk-checkup`。

- [ ] **Step 4: 基线验证**

```bash
npm run lint
npm run check:security
npm run test:eval
npm run build
```
Expected: 四条命令全部成功；把输出贴到 PR 描述或任务记录。

- [ ] **Step 5: 记录基线**

在 `docs/superpowers/plans/2026-10-28-family-risk-assessment.md` 文末追加一行：
```markdown
- Baseline (2026-10-28): lint/security/test:eval/build all green on `feat/family-risk-checkup`.
```
然后：
```bash
git add docs/superpowers/plans/2026-10-28-family-risk-assessment.md
git commit -m "docs: record checkup baseline"
```

**Acceptance:** 分支、tag 存在；四条基线命令通过。

---

### Task 2: 类型与维度

**Files:**
- Create: `src/lib/checkup/types.ts`
- Create: `src/lib/checkup/dimensions.ts`
- Test: `eval/checkup-dimensions.test.ts`

- [ ] **Step 1: 写失败测试**

`eval/checkup-dimensions.test.ts`：
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, getDimension } from "../src/lib/checkup/dimensions";

test("has 10 dimensions with unique ids", () => {
  assert.equal(DIMENSIONS.length, 10);
  assert.equal(new Set(DIMENSIONS.map((d) => d.id)).size, 10);
});

test("family and protection are must-ask", () => {
  assert.equal(getDimension("family").askPolicy, "must");
  assert.equal(getDimension("protection").askPolicy, "must");
});

test("inheritance is main-domain", () => {
  assert.equal(getDimension("inheritance").askPolicy, "main_domain");
});

test("cashflow/assets/health/education/retirement/business/marriage are mentioned-only", () => {
  for (const id of ["cashflow", "assets", "health", "education", "retirement", "business", "marriage"] as const) {
    assert.equal(getDimension(id).askPolicy, "mentioned_only");
  }
});
```

Run: `npx tsx --test eval/checkup-dimensions.test.ts`
Expected: FAIL（`Cannot find module .../dimensions`）。

- [ ] **Step 2: 写 `types.ts`**

```ts
export type CheckupDimensionId =
  | "family"
  | "protection"
  | "inheritance"
  | "cashflow"
  | "assets"
  | "health"
  | "education"
  | "retirement"
  | "business"
  | "marriage";

export type CheckupDomain =
  | "protection"
  | "medical"
  | "education"
  | "retirement"
  | "inheritance"
  | "business"
  | "marriage";

export type AskPolicy = "must" | "main_domain" | "mentioned_only";

export interface DimensionDefinition {
  id: CheckupDimensionId;
  label: string;
  fields: string[];
  askPolicy: AskPolicy;
  weight: number;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  dimension: CheckupDimensionId;
  field: string;
  prompt: string;
  options: QuestionOption[];
  allowFreeText: boolean;
  required: boolean;
  weight: number;
}

export interface Answer {
  questionId: string;
  dimension: CheckupDimensionId;
  field: string;
  value: string;
  freeText?: string;
  skipped: boolean;
}

export type RiskLevel = "green" | "yellow" | "red" | "unknown";
export type DataStatus = "enough" | "partial" | "insufficient";

export interface WealthIndexScore {
  name: "安全指数" | "流动指数" | "自由指数" | "独立指数" | "传承指数";
  score: number | null;
  level: RiskLevel;
  dataStatus: DataStatus;
  reason: string;
}

export interface RiskItem {
  title: string;
  severity: "high" | "medium" | "low";
  phenomenon: string;
  whyItMatters: string;
  ifIgnored: string;
  suggestedAction: string;
  sourceRefs: string[];
}

export interface ActionItem {
  period: string;
  action: string;
  owner: string;
}

export interface BudgetRange {
  min: number | null;
  max: number | null;
  basis: string;
  disclaimer: string;
}

export interface CheckupReport {
  profile: {
    familyStructure: string;
    lifeStage: string;
    summary: string;
  };
  wealthIndices: WealthIndexScore[];
  topRisks: RiskItem[];
  actionPlan: ActionItem[];
  budgetRange: BudgetRange;
  nextStep: string;
  disclaimer: string;
}

export interface SessionPayload {
  sessionId: string;
  iat: number;
  exp: number;
}

export interface TriageResult {
  primaryDomain: CheckupDomain;
  secondaryDomain: CheckupDomain | null;
  confidence: number;
  signals: string[];
}
```

- [ ] **Step 3: 写 `dimensions.ts`**

```ts
import type { CheckupDimensionId, DimensionDefinition } from "./types";

export const DIMENSIONS: DimensionDefinition[] = [
  { id: "family", label: "家庭结构", fields: ["ageStage", "maritalStatus", "children", "parents", "careDependents", "businessInvolvement"], askPolicy: "must", weight: 3 },
  { id: "protection", label: "已有保障", fields: ["socialInsurance", "medicalInsurance", "criticalIllness", "lifeInsurance", "accidentInsurance"], askPolicy: "must", weight: 3 },
  { id: "inheritance", label: "传承安排", fields: ["childrenMarriage", "assetOwnership", "inheritanceIntent", "will", "trust", "insuranceBeneficiary"], askPolicy: "main_domain", weight: 3 },
  { id: "cashflow", label: "收支", fields: ["incomeSources", "annualIncomeRange", "annualExpenseRange", "annualSurplusRange", "passiveIncomeRange"], askPolicy: "mentioned_only", weight: 2 },
  { id: "assets", label: "资产与负债", fields: ["liquidAssetsRange", "fixedAssets", "totalAssetsRange", "totalDebtRange", "mortgageRange", "guarantees"], askPolicy: "mentioned_only", weight: 2 },
  { id: "health", label: "健康", fields: ["checkupAbnormalities", "preExistingConditions", "familyHistory"], askPolicy: "mentioned_only", weight: 2 },
  { id: "education", label: "教育", fields: ["childrenEducationStage", "studyAbroadPlan"], askPolicy: "mentioned_only", weight: 2 },
  { id: "retirement", label: "养老", fields: ["retirementAge", "pension", "retirementPlan"], askPolicy: "mentioned_only", weight: 2 },
  { id: "business", label: "企业", fields: ["businessOwnership", "equity", "familyBusinessMix", "succession"], askPolicy: "mentioned_only", weight: 2 },
  { id: "marriage", label: "婚姻", fields: ["maritalStatus", "preMaritalAssets", "spouseDebt"], askPolicy: "mentioned_only", weight: 2 },
];

export function getDimension(id: CheckupDimensionId): DimensionDefinition {
  const dimension = DIMENSIONS.find((item) => item.id === id);
  if (!dimension) throw new Error(`Unknown dimension: ${id}`);
  return dimension;
}

export function getMustAskDimensions(): DimensionDefinition[] {
  return DIMENSIONS.filter((item) => item.askPolicy === "must");
}

export function getMentionedOnlyDimensions(): DimensionDefinition[] {
  return DIMENSIONS.filter((item) => item.askPolicy === "mentioned_only");
}
```

- [ ] **Step 4: 跑测试并提交**

Run: `npx tsx --test eval/checkup-dimensions.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/types.ts src/lib/checkup/dimensions.ts eval/checkup-dimensions.test.ts
git commit -m "feat(checkup): add checkup types and dimensions"
```

**Acceptance:** 10 个维度；family/protection 必问；inheritance 主域；其余按需。

---

### Task 3: 28 题种子题库

**Files:**
- Create: `src/lib/checkup/question-bank.ts`
- Test: `eval/checkup-question-bank.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { QUESTION_BANK, getQuestionById } from "../src/lib/checkup/question-bank";
import { DIMENSIONS } from "../src/lib/checkup/dimensions";

test("question ids are unique", () => {
  assert.equal(new Set(QUESTION_BANK.map((q) => q.id)).size, QUESTION_BANK.length);
});

test("every dimension has at least 2 questions; family has at least 4", () => {
  for (const dimension of DIMENSIONS) {
    const count = QUESTION_BANK.filter((q) => q.dimension === dimension.id).length;
    assert.ok(count >= 2, `${dimension.id} has ${count}`);
  }
  assert.ok(QUESTION_BANK.filter((q) => q.dimension === "family").length >= 4);
});

test("options are 2-4 and prompts are non-empty", () => {
  for (const q of QUESTION_BANK) {
    assert.ok(q.options.length >= 2 && q.options.length <= 4, q.id);
    assert.ok(q.prompt.trim().length > 0, q.id);
  }
});

test("family questions are required", () => {
  for (const q of QUESTION_BANK.filter((q) => q.dimension === "family")) {
    assert.equal(q.required, true);
  }
});

test("no forbidden product or guarantee words", () => {
  const text = QUESTION_BANK.map((q) => `${q.prompt} ${q.options.map((o) => o.label).join(" ")}`).join(" ");
  for (const word of ["友邦", "国寿", "复星", "万欣和", "稳赚", "保本", "保证领取"]) {
    assert.ok(!text.includes(word), word);
  }
});

test("getQuestionById finds a question", () => {
  assert.equal(getQuestionById("family_members")?.dimension, "family");
  assert.equal(getQuestionById("missing"), undefined);
});
```

Run: `npx tsx --test eval/checkup-question-bank.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 2: 写题库**

```ts
import type { CheckupDimensionId, Question } from "./types";

function q(
  id: string,
  dimension: CheckupDimensionId,
  field: string,
  prompt: string,
  options: Array<[string, string]>,
  required = false,
  weight = 1,
): Question {
  return {
    id,
    dimension,
    field,
    prompt,
    options: options.map(([value, label]) => ({ value, label })),
    allowFreeText: true,
    required,
    weight,
  };
}

export const QUESTION_BANK: Question[] = [
  // 家庭结构（必问，4 题）
  q("family_members", "family", "household", "家里现在常住的是哪几口人？", [
    ["couple", "夫妻两人"], ["children", "夫妻 + 孩子"], ["three_gen", "三代同堂"], ["other", "其他"],
  ], true, 3),
  q("family_children", "family", "children", "孩子多大了、结婚了吗？", [
    ["school", "还在上学"], ["working", "已工作未婚"], ["married", "已结婚"], ["none", "还没有孩子"],
  ], true, 3),
  q("family_parents", "family", "parents", "父母那边需要你们照顾吗？", [
    ["healthy", "身体健康，不需要"], ["financial", "需要经济支持"], ["care", "需要日常照护"], ["other", "其他"],
  ], true, 2),
  q("family_business", "family", "businessInvolvement", "家里有人做生意或持股吗？", [
    ["none", "没有"], ["self", "有，本人经营"], ["family", "有，配偶或子女经营"], ["passive", "有，但未参与经营"],
  ], true, 2),

  // 已有保障（必问，4 题）
  q("protection_medical", "protection", "medicalInsurance", "现在有商业医疗险吗？", [
    ["million", "有，百万医疗"], ["mid_high", "有，中高端医疗"], ["social_only", "只有社保"], ["unknown", "不清楚"],
  ], true, 3),
  q("protection_critical", "protection", "criticalIllness", "有重疾险吗？保额大概多少？", [
    ["none", "没有"], ["under30", "30 万以下"], ["30_50", "30–50 万"], ["over50", "50 万以上"], ["unknown", "不清楚"],
  ], true, 3),
  q("protection_life", "protection", "lifeInsurance", "家庭主要收入的人有寿险或意外险吗？", [
    ["both", "都有"], ["accident_only", "只有意外"], ["life_only", "只有寿险"], ["none", "都没有"], ["unknown", "不清楚"],
  ], true, 2),
  q("protection_runway", "protection", "emergencyRunway", "如果明天收入中断，家里能撑多久？", [
    ["under3", "3 个月以内"], ["3_6", "3–6 个月"], ["6_12", "6–12 个月"], ["over12", "1 年以上"], ["unknown", "说不清"],
  ], true, 3),

  // 传承（4 题）
  q("inheritance_intent", "inheritance", "inheritanceIntent", "家里的钱将来怎么给到孩子，认真想过吗？", [
    ["documented", "已经写进文件"], ["oral", "口头跟家人说过"], ["thought", "想过，但没安排"], ["never", "还没想过"], ["young", "孩子还小"],
  ], false, 3),
  q("inheritance_children_marriage", "inheritance", "childrenMarriage", "孩子结婚时，你希望这笔钱是婚前给还是婚后给？", [
    ["before", "婚前给"], ["after", "婚后给"], ["depends", "看情况"], ["never", "没想过"],
  ], false, 2),
  q("inheritance_tools", "inheritance", "inheritanceTools", "现在有用遗嘱、信托或保单受益人做安排吗？", [
    ["will", "有遗嘱"], ["trust", "有信托 / 保险金信托"], ["beneficiary", "保单写了受益人"], ["none", "都没有"], ["unknown", "不清楚"],
  ], false, 3),
  q("inheritance_worry", "inheritance", "inheritanceWorry", "你最担心孩子拿到钱后发生什么？", [
    ["split", "被分走"], ["spend", "被挥霍"], ["manage", "不会管"], ["dispute", "家庭纠纷"], ["none", "没担心"],
  ], false, 2),

  // 收支（4 题，客户提到才问）
  q("cashflow_income_source", "cashflow", "incomeSources", "家里主要收入来源是什么？", [
    ["salary", "工资"], ["business", "经营"], ["investment", "投资 / 房租"], ["mixed", "混合"], ["skip", "不想说"],
  ]),
  q("cashflow_income_range", "cashflow", "annualIncomeRange", "家庭年收入大概在哪个区间？", [
    ["under30", "30 万以下"], ["30_60", "30–60 万"], ["60_100", "60–100 万"], ["over100", "100 万以上"], ["skip", "不想说"],
  ]),
  q("cashflow_expense_range", "cashflow", "annualExpenseRange", "家庭一年固定支出大概在哪个区间？", [
    ["under10", "10 万以下"], ["10_30", "10–30 万"], ["30_50", "30–50 万"], ["over50", "50 万以上"], ["skip", "不想说"],
  ]),
  q("cashflow_passive", "cashflow", "passiveIncomeRange", "现在有房租、股息、年金这类被动收入吗？", [
    ["none", "没有"], ["small", "有一点"], ["partial", "能覆盖部分支出"], ["most", "能覆盖大部分支出"], ["skip", "不想说"],
  ]),

  // 资产与负债（2 题）
  q("assets_liquid", "assets", "liquidAssetsRange", "家里能快速变现的钱大概多少？", [
    ["under50", "50 万以下"], ["50_100", "50–100 万"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ]),
  q("assets_debt", "assets", "totalDebtRange", "房贷、经营贷、担保大概多少？", [
    ["none", "没有"], ["under100", "100 万以下"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ]),

  // 健康（2 题）
  q("health_conditions", "health", "preExistingConditions", "家里人有体检异常或既往症吗？", [
    ["none", "没有"], ["controlled", "有，已控制"], ["treating", "有，正在治疗"], ["skip", "不想说"],
  ]),
  q("health_history", "health", "familyHistory", "家族里有重大疾病史吗？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ]),

  // 教育（2 题）
  q("education_stage", "education", "childrenEducationStage", "孩子现在处于什么教育阶段？", [
    ["preschool", "学龄前"], ["primary", "小学"], ["middle", "中学"], ["college", "大学 / 留学"], ["worked", "已工作"],
  ]),
  q("education_plan", "education", "studyAbroadPlan", "有留学或大额教育计划吗？", [
    ["none", "没有"], ["domestic", "有，国内"], ["abroad", "有，留学"], ["undecided", "还没想"],
  ]),

  // 养老（2 题）
  q("retirement_age", "retirement", "retirementAge", "你希望多大退休？", [
    ["before50", "50 岁前"], ["50_55", "50–55 岁"], ["55_60", "55–60 岁"], ["after60", "60 岁以后"], ["never", "没想过"],
  ]),
  q("retirement_income", "retirement", "retirementPlan", "退休后主要靠什么？", [
    ["social", "社保"], ["savings", "储蓄 / 理财"], ["passive", "房租 / 年金"], ["children", "子女"], ["never", "没想过"],
  ]),

  // 企业（2 题）
  q("business_ownership", "business", "businessOwnership", "家里有企业经营或股权吗？", [
    ["none", "没有"], ["self", "有，本人经营"], ["family", "有，家人经营"], ["passive", "有，但未参与"],
  ]),
  q("business_guarantee", "business", "guarantees", "企业借钱时，有没有用个人或家庭资产做担保？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["no_business", "没有企业"],
  ]),

  // 婚姻（2 题）
  q("marriage_status", "marriage", "maritalStatus", "现在的婚姻状态？", [
    ["first", "初婚"], ["remarried", "再婚"], ["divorced", "离异"], ["widowed", "丧偶"], ["skip", "不想说"],
  ]),
  q("marriage_assets", "marriage", "preMaritalAssets", "婚前 / 婚内财产有书面约定吗？", [
    ["yes", "有"], ["no", "没有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ]),
];

export function getQuestionById(id: string): Question | undefined {
  return QUESTION_BANK.find((question) => question.id === id);
}

export function getQuestionsForDimension(dimension: CheckupDimensionId): Question[] {
  return QUESTION_BANK.filter((question) => question.dimension === dimension);
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-question-bank.test.ts`
Expected: PASS（28 题；family 4 题）。

```bash
git add src/lib/checkup/question-bank.ts eval/checkup-question-bank.test.ts
git commit -m "feat(checkup): add 28-question seed bank"
```

**Acceptance:** 28 题、10 维度各有至少 2 题、family 4 题、无产品/承诺词。

---

### Task 4: 5 大指数计算

**Files:**
- Create: `src/lib/checkup/indices.ts`
- Test: `eval/checkup-indices.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { calcAllIndices, calcSafety, calcLiquidity, calcFreedom, calcIndependence, calcInheritance } from "../src/lib/checkup/indices";

test("safety index averages available components", () => {
  const result = calcSafety({
    annualIncome: 600000, annualExpense: 300000,
    liquidAssets: 300000, totalAssets: 1000000, totalDebt: 200000,
    medicalCoverage: 1000000, criticalCoverage: 3000000, lifeCoverage: 6000000,
  });
  assert.equal(result.dataStatus, "enough");
  assert.ok(typeof result.score === "number");
});

test("safety index is insufficient without income", () => {
  const result = calcSafety({ annualExpense: 300000 });
  assert.equal(result.dataStatus, "insufficient");
  assert.equal(result.score, null);
});

test("liquidity index", () => {
  assert.equal(calcLiquidity({ liquidAssets: 200000, totalAssets: 1000000 }).score, 20);
  assert.equal(calcLiquidity({ liquidAssets: null }).score, null);
});

test("freedom index caps at 100", () => {
  assert.equal(calcFreedom({ passiveIncome: 500000, annualExpense: 300000 }).score, 100);
  assert.equal(calcFreedom({ passiveIncome: 150000, annualExpense: 300000 }).score, 50);
});

test("independence index", () => {
  assert.equal(calcIndependence({ totalAssets: 1000000, lifeDebt: 2000000 }).score, 50);
  assert.equal(calcIndependence({ totalAssets: 3000000, lifeDebt: 2000000 }).score, 100);
});

test("inheritance index", () => {
  assert.equal(calcInheritance({ inheritanceAssets: 300000, totalAssets: 1000000 }).score, 30);
});

test("all indices keeps unknown when data missing", () => {
  const all = calcAllIndices({ annualExpense: 300000 });
  assert.equal(all.length, 5);
  assert.ok(all.some((item) => item.level === "unknown"));
});
```

Run: `npx tsx --test eval/checkup-indices.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 2: 写 `indices.ts`**

```ts
import type { DataStatus, RiskLevel, WealthIndexScore } from "./types";

export interface IndexInput {
  annualIncome?: number | null;
  annualExpense?: number | null;
  liquidAssets?: number | null;
  totalAssets?: number | null;
  totalDebt?: number | null;
  medicalCoverage?: number | null;
  criticalCoverage?: number | null;
  lifeCoverage?: number | null;
  passiveIncome?: number | null;
  inheritanceAssets?: number | null;
  lifeDebt?: number | null;
}

export interface IndexResult {
  score: number | null;
  dataStatus: DataStatus;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelOf(score: number | null, green: number, yellow: number): RiskLevel {
  if (score === null) return "unknown";
  if (score >= green) return "green";
  if (score >= yellow) return "yellow";
  return "red";
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

export function calcSafety(input: IndexInput): IndexResult {
  if (!input.annualIncome || input.annualIncome <= 0 || !input.annualExpense || input.annualExpense <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  const balance = clamp((1 - input.annualExpense / input.annualIncome) * 100);
  const debtBalance =
    typeof input.totalAssets === "number" && input.totalAssets > 0 && typeof input.totalDebt === "number"
      ? clamp((1 - input.totalDebt / input.totalAssets) * 100)
      : null;
  const cash =
    typeof input.liquidAssets === "number"
      ? clamp(Math.min(1, input.liquidAssets / (input.annualExpense / 2)) * 100)
      : null;
  const medical =
    typeof input.medicalCoverage === "number"
      ? clamp(Math.min(1, input.medicalCoverage / 1000000) * 100)
      : null;
  const critical =
    typeof input.criticalCoverage === "number"
      ? clamp(Math.min(1, input.criticalCoverage / (5 * input.annualIncome)) * 100)
      : null;
  const life =
    typeof input.lifeCoverage === "number"
      ? clamp(Math.min(1, input.lifeCoverage / (10 * input.annualIncome)) * 100)
      : null;
  const present = [balance, debtBalance, cash, medical, critical, life].filter((value) => value !== null);
  const score = average(present);
  const dataStatus: DataStatus = present.length >= 6 ? "enough" : present.length >= 3 ? "partial" : "insufficient";
  return { score, dataStatus };
}

export function calcLiquidity(input: IndexInput): IndexResult {
  if (typeof input.liquidAssets !== "number" || typeof input.totalAssets !== "number" || input.totalAssets <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp((input.liquidAssets / input.totalAssets) * 100), dataStatus: "enough" };
}

export function calcFreedom(input: IndexInput): IndexResult {
  if (typeof input.passiveIncome !== "number" || typeof input.annualExpense !== "number" || input.annualExpense <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp(Math.min(1, input.passiveIncome / input.annualExpense) * 100), dataStatus: "enough" };
}

export function calcIndependence(input: IndexInput): IndexResult {
  const lifeDebt =
    typeof input.lifeDebt === "number"
      ? input.lifeDebt
      : typeof input.annualExpense === "number"
        ? input.annualExpense * 25 + (input.totalDebt ?? 0)
        : null;
  if (typeof input.totalAssets !== "number" || !lifeDebt || lifeDebt <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp(Math.min(1, input.totalAssets / lifeDebt) * 100), dataStatus: "enough" };
}

export function calcInheritance(input: IndexInput): IndexResult {
  if (typeof input.inheritanceAssets !== "number" || typeof input.totalAssets !== "number" || input.totalAssets <= 0) {
    return { score: null, dataStatus: "insufficient" };
  }
  return { score: clamp((input.inheritanceAssets / input.totalAssets) * 100), dataStatus: "enough" };
}

export function calcAllIndices(input: IndexInput): WealthIndexScore[] {
  const safety = calcSafety(input);
  const liquidity = calcLiquidity(input);
  const freedom = calcFreedom(input);
  const independence = calcIndependence(input);
  const inheritance = calcInheritance(input);
  return [
    { name: "安全指数", score: safety.score, level: levelOf(safety.score, 80, 40), dataStatus: safety.dataStatus, reason: "" },
    { name: "流动指数", score: liquidity.score, level: levelOf(liquidity.score, 51, 21), dataStatus: liquidity.dataStatus, reason: "" },
    { name: "自由指数", score: freedom.score, level: levelOf(freedom.score, 100, 50), dataStatus: freedom.dataStatus, reason: "" },
    { name: "独立指数", score: independence.score, level: levelOf(independence.score, 100, 60), dataStatus: independence.dataStatus, reason: "" },
    { name: "传承指数", score: inheritance.score, level: levelOf(inheritance.score, 50, 20), dataStatus: inheritance.dataStatus, reason: "" },
  ];
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-indices.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/indices.ts eval/checkup-indices.test.ts
git commit -m "feat(checkup): add five wealth index calculators"
```

**Acceptance:** 5 个公式、缺失数据返回 `null`/`unknown`；单测全过。

---

### Task 5: 无状态签名令牌

**Files:**
- Create: `src/lib/checkup/session.ts`
- Test: `eval/checkup-session.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, verifySessionToken } from "../src/lib/checkup/session";

test("signs and verifies", () => {
  const token = createSessionToken("s-1", 1000);
  const payload = verifySessionToken(token, 2000);
  assert.equal(payload?.sessionId, "s-1");
});

test("rejects tampered token", () => {
  const token = createSessionToken("s-1", 1000);
  assert.equal(verifySessionToken(token.slice(0, -2) + "xx", 2000), null);
});

test("rejects expired token", () => {
  const token = createSessionToken("s-1", 1000);
  assert.equal(verifySessionToken(token, 1000 + 3 * 60 * 60 * 1000), null);
});
```

- [ ] **Step 2: 写 `session.ts`**

```ts
import crypto from "crypto";
import type { SessionPayload } from "./types";

const TTL_MS = 2 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET 必须至少 32 字符");
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(crypto.createHmac("sha256", getSecret()).update(payload).digest());
}

export function createSessionToken(sessionId: string, now = Date.now()): string {
  const payload: SessionPayload = { sessionId, iat: now, exp: now + TTL_MS };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string, now = Date.now()): SessionPayload | null {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = sign(body);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as SessionPayload;
    if (!payload.sessionId || typeof payload.exp !== "number" || now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-session.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/session.ts eval/checkup-session.test.ts
git commit -m "feat(checkup): add signed session tokens"
```

**Acceptance:** 签名/验签/篡改/过期四类行为正确。

---

### Task 6: 风险域分诊

**Files:**
- Create: `src/lib/checkup/triage.ts`
- Test: `eval/checkup-triage.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { triageFromText } from "../src/lib/checkup/triage";

test("detects inheritance", () => {
  const result = triageFromText("我想给孩子留一笔钱，担心他结婚后被分走，遗嘱也没写");
  assert.equal(result.primaryDomain, "inheritance");
  assert.ok(result.signals.length > 0);
});

test("detects protection", () => {
  const result = triageFromText("家里只有社保，怕生大病，重疾险还没买");
  assert.equal(result.primaryDomain, "protection");
});

test("detects business", () => {
  const result = triageFromText("我自己开公司，企业贷款用了个人担保，担心家企混同");
  assert.equal(result.primaryDomain, "business");
});

test("falls back to protection with low confidence", () => {
  const result = triageFromText("随便看看");
  assert.equal(result.primaryDomain, "protection");
  assert.ok(result.confidence < 0.5);
});

test("returns at most two domains", () => {
  const result = triageFromText("孩子结婚、公司债务、养老、医疗都担心");
  assert.ok(result.primaryDomain);
  assert.ok(result.secondaryDomain === null || typeof result.secondaryDomain === "string");
});
```

- [ ] **Step 2: 写 `triage.ts`**

```ts
import type { CheckupDomain, TriageResult } from "./types";

const KEYWORDS: Record<CheckupDomain, string[]> = {
  protection: ["保障", "重疾", "医疗", "生病", "保额", "保险够不够", "意外"],
  medical: ["医疗险", "百万医疗", "中高端医疗", "DRG", "外购药", "住院"],
  education: ["教育", "留学", "学费", "孩子上学", "教育金"],
  retirement: ["养老", "退休", "养老金", "老年生活"],
  inheritance: ["传承", "继承", "遗嘱", "受益人", "给孩子留", "孩子结婚", "婚前", "婚后", "分走", "挥霍", "信托"],
  business: ["企业", "公司", "股权", "担保", "家企", "债务", "经营"],
  marriage: ["婚姻", "离婚", "配偶", "再婚", "婚内", "婚前财产"],
};

const DOMAIN_ORDER: CheckupDomain[] = ["inheritance", "protection", "business", "marriage", "retirement", "education", "medical"];

export function triageFromText(text: string): TriageResult {
  const source = String(text || "");
  const scored = DOMAIN_ORDER.map((domain) => {
    const signals = KEYWORDS[domain].filter((word) => source.includes(word));
    return { domain, signals, score: signals.length };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { primaryDomain: "protection", secondaryDomain: null, confidence: 0.3, signals: [] };
  }

  const primary = scored[0];
  const secondary = scored[1] && scored[1].score > 0 ? scored[1] : null;
  const confidence = Math.min(0.9, 0.4 + primary.score * 0.1);
  return {
    primaryDomain: primary.domain,
    secondaryDomain: secondary?.domain ?? null,
    confidence,
    signals: [...primary.signals, ...(secondary?.signals ?? [])].slice(0, 6),
  };
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-triage.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/triage.ts eval/checkup-triage.test.ts
git commit -m "feat(checkup): add risk domain triage"
```

**Acceptance:** 7 个风险域；最多 2 个；低置信回退保障域。

---

### Task 7: 追问引擎（先听再问，6–12 轮收口）

**Files:**
- Create: `src/lib/checkup/follow-up.ts`
- Test: `eval/checkup-followup.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { applyAnswer, selectNextQuestion, shouldStop } from "../src/lib/checkup/follow-up";
import type { Answer, TriageResult } from "../src/lib/checkup/types";

const triage: TriageResult = { primaryDomain: "inheritance", secondaryDomain: null, confidence: 0.7, signals: [] };

function state(answers: Answer[] = []) {
  return { answers, triage, customerWantsReport: false };
}

test("asks family first", () => {
  const next = selectNextQuestion(state());
  assert.equal(next?.dimension, "family");
});

test("asks protection after family", () => {
  const next = selectNextQuestion(state([
    { questionId: "family_members", dimension: "family", field: "household", value: "children", skipped: false },
    { questionId: "family_children", dimension: "family", field: "children", value: "married", skipped: false },
    { questionId: "family_parents", dimension: "family", field: "parents", value: "healthy", skipped: false },
    { questionId: "family_business", dimension: "family", field: "businessInvolvement", value: "none", skipped: false },
  ]));
  assert.equal(next?.dimension, "protection");
});

test("does not ask mentioned-only dimensions unless mentioned", () => {
  const next = selectNextQuestion(state([
    { questionId: "family_members", dimension: "family", field: "household", value: "children", skipped: false },
    { questionId: "family_children", dimension: "family", field: "children", value: "married", skipped: false },
    { questionId: "family_parents", dimension: "family", field: "parents", value: "healthy", skipped: false },
    { questionId: "family_business", dimension: "family", field: "businessInvolvement", value: "none", skipped: false },
  ]));
  assert.notEqual(next?.dimension, "health");
  assert.notEqual(next?.dimension, "education");
});

test("stops at 12 answers", () => {
  const answers = Array.from({ length: 12 }, (_, index) => ({
    questionId: `q${index}`, dimension: "family" as const, field: `f${index}`, value: "x", skipped: false,
  }));
  assert.equal(shouldStop(state(answers)), true);
});

test("customer can request report", () => {
  assert.equal(shouldStop({ ...state(), customerWantsReport: true }), true);
});

test("applyAnswer appends", () => {
  const question = selectNextQuestion(state())!;
  const next = applyAnswer(state(), question, { value: "couple", skipped: false });
  assert.equal(next.answers.length, 1);
});
```

- [ ] **Step 2: 写 `follow-up.ts`**

```ts
import { QUESTION_BANK, getQuestionsForDimension } from "./question-bank";
import type { Answer, Question, TriageResult } from "./types";

export interface FollowUpState {
  answers: Answer[];
  triage: TriageResult;
  customerWantsReport: boolean;
}

const MAX_ROUNDS = 12;
const MIN_ROUNDS = 6;

export function shouldStop(state: FollowUpState): boolean {
  if (state.customerWantsReport) return true;
  if (state.answers.length >= MAX_ROUNDS) return true;
  if (state.answers.length < MIN_ROUNDS) return false;
  return selectNextQuestion(state) === null;
}

export function selectNextQuestion(state: FollowUpState): Question | null {
  const answered = new Set(state.answers.map((answer) => answer.questionId));

  // 1. 家庭结构必问
  const family = getUnanswered(getQuestionsForDimension("family"), answered);
  if (family) return family;

  // 2. 保障必问
  const protection = getUnanswered(getQuestionsForDimension("protection"), answered);
  if (protection) return protection;

  // 3. 主域深挖
  const primaryQuestions = getQuestionsForDomain(state.triage.primaryDomain);
  const primary = getUnanswered(primaryQuestions, answered);
  if (primary) return primary;

  // 4. 次域深挖
  if (state.triage.secondaryDomain) {
    const secondary = getUnanswered(getQuestionsForDomain(state.triage.secondaryDomain), answered);
    if (secondary) return secondary;
  }

  // 5. 客户提到过的维度，才追问
  const mentionedDimensions = new Set(state.answers.map((answer) => answer.dimension));
  for (const dimension of mentionedDimensions) {
    const next = getUnanswered(getQuestionsForDimension(dimension), answered);
    if (next) return next;
  }

  return null;
}

function getUnanswered(questions: Question[], answered: Set<string>): Question | null {
  return questions.find((question) => !answered.has(question.id)) ?? null;
}

function getQuestionsForDomain(domain: TriageResult["primaryDomain"]): Question[] {
  if (domain === "protection" || domain === "medical") return getQuestionsForDimension("protection");
  if (domain === "inheritance") return getQuestionsForDimension("inheritance");
  if (domain === "retirement") return getQuestionsForDimension("retirement");
  if (domain === "education") return getQuestionsForDimension("education");
  if (domain === "business") return getQuestionsForDimension("business");
  if (domain === "marriage") return getQuestionsForDimension("marriage");
  return [];
}

export function applyAnswer(state: FollowUpState, question: Question, input: { value: string; freeText?: string; skipped?: boolean }): FollowUpState {
  const answer: Answer = {
    questionId: question.id,
    dimension: question.dimension,
    field: question.field,
    value: input.value,
    freeText: input.freeText,
    skipped: input.skipped ?? false,
  };
  return { ...state, answers: [...state.answers, answer] };
}

export function progressLabel(state: FollowUpState): string {
  return `${Math.min(state.answers.length, MAX_ROUNDS)}/${MAX_ROUNDS}`;
}

export { MAX_ROUNDS, MIN_ROUNDS };
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-followup.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/follow-up.ts eval/checkup-followup.test.ts
git commit -m "feat(checkup): add lightweight follow-up engine"
```

**Acceptance:** family 先问；保障第二；主/次域深挖；客户提到的维度才追问；12 轮收口。

---

### Task 8: Prompt 构造

**Files:**
- Create: `src/lib/checkup/prompts.ts`
- Test: `eval/checkup-prompts.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildPhrasePrompt, buildReportSystemPrompt, buildReportUserPrompt } from "../src/lib/checkup/prompts";
import { QUESTION_BANK } from "../src/lib/checkup/question-bank";

test("report system prompt has compliance and 5 indices", () => {
  const prompt = buildReportSystemPrompt();
  for (const word of ["安全指数", "流动指数", "自由指数", "独立指数", "传承指数", "不构成投保建议", "不得承诺收益", "不点名产品"]) {
    assert.ok(prompt.includes(word), word);
  }
});

test("phrase prompt includes question and no-answer permission", () => {
  const prompt = buildPhrasePrompt(QUESTION_BANK[0], "客户说孩子刚结婚");
  assert.ok(prompt.includes(QUESTION_BANK[0].prompt));
  assert.ok(prompt.includes("不想说"));
});

test("report user prompt includes structured data", () => {
  const prompt = buildReportUserPrompt({ profile: "x", indices: [], risks: [], answers: [] });
  assert.ok(prompt.includes("家庭财富平衡"));
});
```

- [ ] **Step 2: 写 `prompts.ts`**

```ts
import type { Answer, CheckupReport, Question, RiskItem, WealthIndexScore } from "./types";

export function buildPhrasePrompt(question: Question, context: string): string {
  return `你是家庭风险测评的提问助手。请把下面的问题改写成一句自然、口语、不带压迫感的中文问题，只输出这一句。

原始问题：${question.prompt}
客户上下文：${context || "无"}
要求：
- 一次只问一个问题
- 允许客户说「不想说 / 说不清 / 跳过」
- 不推销、不承诺、不制造焦虑
- 不出现产品名、公司名、费率、收益`;
}

export function buildReportSystemPrompt(): string {
  return `你是「AI家庭风险测评」的报告生成器。你的任务是把客户自述的信息整理成一份家庭风险自查报告，不是销售方案。

## 报告结构
1. 家庭画像
2. 家庭财富平衡 5 大指数：安全指数、流动指数、自由指数、独立指数、传承指数
3. Top 5 风险：现象 / 为什么重要 / 不处理的后果 / 建议动作
4. 90 天行动清单
5. 家庭风险预算区间
6. 下一步
7. 免责声明

## 合规边界
- 不推荐具体产品、公司、投保链接
- 不点名产品，不出现产品名、费率、现价、收益演示
- 不得承诺收益、不得承诺理赔、不得预判核保
- 不贬低同业、不制造焦虑
- 法律内容只讲规则，标注「不构成法律意见」
- 报告由 AI 辅助生成，不构成投保建议

## 写作要求
- 中文、克制、具体
- 每条风险必须写「不处理的后果」
- 数据不足的指数写「信息不足」，不要编造
- 最后必须附固定免责声明`;
}

export function buildReportUserPrompt(input: {
  profile: string;
  indices: WealthIndexScore[];
  risks: RiskItem[];
  answers: Answer[];
}): string {
  return `## 客户画像
${input.profile}

## 家庭财富平衡 5 大指数
${JSON.stringify(input.indices, null, 2)}

## 规则识别出的风险
${JSON.stringify(input.risks, null, 2)}

## 客户回答
${JSON.stringify(input.answers, null, 2)}

请输出 JSON，字段与设计文档的 CheckupReport 一致；不要输出 markdown 代码围栏。`;
}

export function buildReportFallback(): CheckupReport {
  return {
    profile: { familyStructure: "信息不足", lifeStage: "信息不足", summary: "本次信息不足，建议线下补充。" },
    wealthIndices: [],
    topRisks: [],
    actionPlan: [],
    budgetRange: { min: null, max: null, basis: "信息不足", disclaimer: "预算参考，非保费报价，非产品推荐" },
    nextStep: "建议预约一次一对一诊断，补充家庭结构与资产信息。",
    disclaimer: "本报告由 AI 辅助生成，仅供风险自查参考，不构成保险产品推荐、投保建议或法律意见。",
  };
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-prompts.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/prompts.ts eval/checkup-prompts.test.ts
git commit -m "feat(checkup): add checkup prompts"
```

**Acceptance:** Prompt 含 5 大指数与合规边界；不出现产品推荐。

---

### Task 8.5: 知识包抽取与加载

**Files:**
- Create: `src/lib/checkup/knowledge/risk-framework.ts`
- Create: `src/lib/checkup/knowledge/inheritance-marriage.ts`
- Create: `src/lib/checkup/knowledge/tools-and-legal.ts`
- Create: `src/lib/checkup/knowledge/cases.ts`
- Create: `src/lib/checkup/knowledge/compliance.ts`
- Create: `src/lib/checkup/knowledge.ts`
- Create: `src/lib/checkup/knowledge/SOURCES.md`
- Test: `eval/checkup-knowledge.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildKnowledgeContext, KNOWLEDGE_SOURCES } from "../src/lib/checkup/knowledge";

test("knowledge context is bounded", () => {
  const text = buildKnowledgeContext();
  assert.ok(text.length > 2000);
  assert.ok(text.length <= 25000);
});

test("sources are listed", () => {
  assert.ok(KNOWLEDGE_SOURCES.length >= 5);
});

test("no product names or guarantee words", () => {
  const text = buildKnowledgeContext();
  for (const word of ["友邦", "国寿", "复星", "万欣和", "稳赚", "保本", "保证领取"]) {
    assert.ok(!text.includes(word), word);
  }
});
```

Run: `npx tsx --test eval/checkup-knowledge.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 2: 写来源清单 `SOURCES.md`**

```markdown
# 知识包来源

- `risk-framework.ts` ← `知识库/转化工具/家庭财富风险体检表-线上版.html`、`培训知识卡/培训工具卡-一丁顾问式统一KYC与客户档案.md`、`培训知识卡/培训辅助工具卡-王勇中高净值家庭结构图与深度KYC.md`
- `inheritance-marriage.ts` ← `自媒体主题卡/体系-家庭财富传承确权三问三闸-V0.1.md`、`自媒体选题库/内容框架-父母给孩子系列（2026-10-20）.md`、`培训知识卡/核心观点地图-保险传承法商民法典继承规则.md`、`核心观点地图-婚姻与家庭财富保全规划.md`
- `tools-and-legal.ts` ← `培训知识卡/保单架构规划指南1.0-导读.md`、`培训工具卡-保险金信托人生剧本T型图.md`、`保险资料/法律法规/` 民法典继承编/婚姻家庭编、保险法、信托法
- `cases.ts` ← `知识库/案例核验/` 3 份已核验案例（匿名）
- `compliance.ts` ← `930合规速查卡.md`、`转化路径设计卡.md`

抽取规则：每份来源只摘 1–3 段与「提问/报告」直接相关的文字；去掉产品名、公司名、费率、现价、收益演示、未核验数字；书与培训观点不等于法律。
```

- [ ] **Step 3: 写 5 个知识文件 + 加载器**

每个文件导出模板字符串，例如 `risk-framework.ts`：

```ts
export const RISK_FRAMEWORK = `
## 家庭风险维度
- 家庭结构：年龄阶段、婚姻、子女及婚否、父母、需照顾的人、是否参与企业
- 已有保障：社保、医疗险、重疾险、寿险/身价、意外
- 收支与资产：收入来源、年结余、流动资产、总资产、负债、担保
- 传承：子女婚姻、资产归属、继承意愿、遗嘱、信托、保单受益人
- 家企与婚姻：企业股权、家企混同、担保、婚前/婚内财产

## 提问纪律
- 先听客户讲，再按需追问；一次只问一个问题
- 收入/资产/负债不主动问；客户提到才追问，用区间
- 客户说「不想说/说不清」时跳过，标「信息不足」
- 家庭结构是必问模块：它决定传承、婚姻、家企风险的判断
`;
```

其余 4 个文件按 `SOURCES.md` 的来源摘录，结构分别是：
- `inheritance-marriage.ts`：三问三闸（给谁/谁管/怎么给）、风险来源三层、6+1 五道坎。
- `tools-and-legal.ts`：保险/信托/遗嘱/公证的功能与边界；民法典继承与婚姻家庭规则；保险法受益人规则；信托法财产独立性；每条标注「不构成法律意见」。
- `cases.ts`：3 个匿名案例的「结构 + 风险 + 判断」，不写姓名/城市/金额细节。
- `compliance.ts`：930 红线（不点名产品、不承诺收益、不贬低同业、不制造焦虑、不留联系方式）+ 报告免责声明。

`knowledge.ts`：

```ts
import { RISK_FRAMEWORK } from "./knowledge/risk-framework";
import { INHERITANCE_MARRIAGE } from "./knowledge/inheritance-marriage";
import { TOOLS_AND_LEGAL } from "./knowledge/tools-and-legal";
import { CASES } from "./knowledge/cases";
import { COMPLIANCE } from "./knowledge/compliance";

export const KNOWLEDGE_SOURCES = [
  "risk-framework",
  "inheritance-marriage",
  "tools-and-legal",
  "cases",
  "compliance",
];

export function buildKnowledgeContext(maxChars = 20000): string {
  const text = [
    `# 风险框架\n${RISK_FRAMEWORK}`,
    `# 传承与婚姻\n${INHERITANCE_MARRIAGE}`,
    `# 工具与法律\n${TOOLS_AND_LEGAL}`,
    `# 匿名案例\n${CASES}`,
    `# 合规边界\n${COMPLIANCE}`,
  ].join("\n\n");
  return text.slice(0, maxChars);
}
```

- [ ] **Step 4: 跑测试并提交**

Run: `npx tsx --test eval/checkup-knowledge.test.ts`
Expected: PASS（总长 2000–25000 字；无产品/承诺词）。

```bash
git add src/lib/checkup/knowledge src/lib/checkup/knowledge.ts eval/checkup-knowledge.test.ts
git commit -m "feat(checkup): add curated knowledge pack"
```

**Acceptance:** 5 个知识文件 + 来源清单；总长受控；无产品名/公司名/承诺词；可追溯到原知识库。

---

### Task 9: 规则化风险识别

**Files:**
- Create: `src/lib/checkup/risk-rules.ts`
- Test: `eval/checkup-risk-rules.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildRiskItems } from "../src/lib/checkup/risk-rules";
import type { Answer } from "../src/lib/checkup/types";

function answer(questionId: string, dimension: Answer["dimension"], value: string): Answer {
  return { questionId, dimension, field: questionId, value, skipped: false };
}

test("flags missing critical illness coverage", () => {
  const risks = buildRiskItems([
    answer("protection_critical", "protection", "none"),
    answer("protection_medical", "protection", "social_only"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("重疾") || r.title.includes("保障")));
});

test("flags inheritance risk for married children without tools", () => {
  const risks = buildRiskItems([
    answer("family_children", "family", "married"),
    answer("inheritance_tools", "inheritance", "none"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("传承")));
});

test("flags business guarantee risk", () => {
  const risks = buildRiskItems([
    answer("business_ownership", "business", "self"),
    answer("business_guarantee", "business", "yes"),
  ], []);
  assert.ok(risks.some((r) => r.title.includes("家企") || r.title.includes("债务")));
});

test("top risks are capped at five and sorted by severity", () => {
  const risks = buildRiskItems([
    answer("protection_critical", "protection", "none"),
    answer("protection_medical", "protection", "social_only"),
    answer("family_children", "family", "married"),
    answer("inheritance_tools", "inheritance", "none"),
    answer("business_ownership", "business", "self"),
    answer("business_guarantee", "business", "yes"),
    answer("marriage_status", "marriage", "remarried"),
  ], []);
  assert.ok(risks.length <= 5);
  assert.equal(risks[0].severity, "high");
});

test("every risk has a consequence and source", () => {
  const risks = buildRiskItems([answer("protection_critical", "protection", "none")], []);
  for (const risk of risks) {
    assert.ok(risk.ifIgnored.length > 0);
    assert.ok(risk.sourceRefs.length > 0);
  }
});
```

- [ ] **Step 2: 写 `risk-rules.ts`**

```ts
import type { Answer, RiskItem } from "./types";

const DISCLAIMER = "以上为风险自查参考，不构成保险产品推荐、投保建议或法律意见。";

function valueOf(answers: Answer[], questionId: string): string | null {
  return answers.find((answer) => answer.questionId === questionId)?.value ?? null;
}

function has(answers: Answer[], questionId: string, values: string[]): boolean {
  const value = valueOf(answers, questionId);
  return value !== null && values.includes(value);
}

export function buildRiskItems(answers: Answer[], indices: Array<{ name: string; level: string }>): RiskItem[] {
  const risks: RiskItem[] = [];

  if (has(answers, "protection_critical", ["none", "under30"]) || has(answers, "protection_medical", ["social_only"])) {
    risks.push({
      title: "家庭保障缺口：大病和医疗自付风险",
      severity: "high",
      phenomenon: "目前重疾或商业医疗险覆盖不足，家庭主要靠社保和存款应对大病。",
      whyItMatters: "大病治疗和康复期收入中断，会同时消耗存款和家庭现金流。",
      ifIgnored: "一旦发生大病，家庭可能被迫动用长期储蓄、卖房或借钱，影响孩子教育和养老安排。",
      suggestedAction: "先核对社保报销范围，再按家庭收入测算医疗险和重疾险的保障缺口；具体产品线下核对合同。",
      sourceRefs: ["5大指数-安全指数", "66问-保障类"],
    });
  }

  if (has(answers, "family_children", ["married"]) && has(answers, "inheritance_tools", ["none", "unknown"])) {
    risks.push({
      title: "传承定向风险：给孩子的钱可能被分走",
      severity: "high",
      phenomenon: "孩子已结婚，但家里还没有用遗嘱、信托或保单受益人做定向安排。",
      whyItMatters: "没有明确安排时，财产按法定继承走，孩子的婚姻变动或家庭纠纷可能影响这笔钱。",
      ifIgnored: "想给孩子的钱可能被分割、被债务追及，或由不希望的人参与分配。",
      suggestedAction: "先梳理家庭结构、资产归属和给钱时点；再决定用受益人、遗嘱还是信托补位，法律文件请律师核对。",
      sourceRefs: ["确权三问三闸-给谁/谁管/怎么给", "66问-C 传承/继承", "6+1-婚姻风险"],
    });
  }

  if (has(answers, "business_ownership", ["self", "family"]) && has(answers, "business_guarantee", ["yes"])) {
    risks.push({
      title: "家企混同风险：企业债务可能牵连家庭",
      severity: "high",
      phenomenon: "企业借款使用了个人或家庭资产担保，家庭资产与企业债务没有清晰隔离。",
      whyItMatters: "企业出现债务或执行风险时，家庭资产可能被追及，影响家人生活与传承安排。",
      ifIgnored: "企业风险可能穿透到家庭，导致房产、存款或保单被用于偿债，传承计划被打断。",
      suggestedAction: "先盘点企业负债、担保和家庭资产边界，再评估合法合规的隔离安排；涉及法律与税务问题转专业人士。",
      sourceRefs: ["确权三问三闸-风险层", "66问-D 债务/家企"],
    });
  }

  if (has(answers, "marriage_status", ["remarried", "divorced"]) || has(answers, "marriage_assets", ["no", "unknown"])) {
    risks.push({
      title: "婚姻财产归属风险：婚前/婚内边界不清",
      severity: "medium",
      phenomenon: "婚姻状态或财产约定存在不确定性，婚前/婚内资产边界没有书面文件。",
      whyItMatters: "婚姻变动时，资产归属和分割方式容易产生争议，影响孩子和家庭安排。",
      ifIgnored: "可能出现资产混同、分割争议，或原本想留给孩子的钱被重新分配。",
      suggestedAction: "先梳理婚前/婚内资产来源与登记，再评估是否需要书面约定；法律文件请律师核对。",
      sourceRefs: ["确权三问三闸-风险层-婚姻", "66问-B 婚姻/婚前"],
    });
  }

  const safety = indices.find((item) => item.name === "安全指数");
  if (safety?.level === "red") {
    risks.push({
      title: "安全指数偏低：家庭应急金和保障不足",
      severity: "high",
      phenomenon: "家庭应急储备、负债或保障覆盖存在明显缺口。",
      whyItMatters: "收入中断或突发支出时，家庭现金流容易断裂。",
      ifIgnored: "可能需要借贷、卖资产或中断长期计划，家庭财务稳定性下降。",
      suggestedAction: "先补 3–6 个月应急金，再核对医疗、重疾、寿险保额；不急于买产品。",
      sourceRefs: ["5大指数-安全指数", "守富与传家"],
    });
  }

  const inheritance = indices.find((item) => item.name === "传承指数");
  if (inheritance?.level === "red" && has(answers, "family_children", ["married", "working"])) {
    risks.push({
      title: "传承指数偏低：传承性资产占比不足",
      severity: "medium",
      phenomenon: "家庭资产中通过人寿保险、信托或遗嘱明确安排的传承性资产占比较低。",
      whyItMatters: "传承性资产不足时，财富传递更多依赖法定继承，确定性较低。",
      ifIgnored: "传承过程可能出现争议、时间延误或资产外流。",
      suggestedAction: "先明确给谁、谁管、怎么给，再评估保险、信托、遗嘱的组合；不点名具体产品。",
      sourceRefs: ["5大指数-传承指数", "6+1-继承风险"],
    });
  }

  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  return risks
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 5)
    .map((risk) => ({ ...risk, ifIgnored: `${risk.ifIgnored}${DISCLAIMER}` }));
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-risk-rules.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/risk-rules.ts eval/checkup-risk-rules.test.ts
git commit -m "feat(checkup): add rule-based risk detection"
```

**Acceptance:** 至少覆盖保障/传承/家企/婚姻/安全/传承指数 6 类；Top 5；每条有「不处理的后果」和 `sourceRefs`。

---

### Task 10: 报告组装（免费版/完整版）

**Files:**
- Create: `src/lib/checkup/report.ts`
- Test: `eval/checkup-report.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, toFreeReport, reportToText } from "../src/lib/checkup/report";

const base = {
  answers: [
    { questionId: "family_members", dimension: "family" as const, field: "household", value: "children", skipped: false },
    { questionId: "family_children", dimension: "family" as const, field: "children", value: "married", skipped: false },
    { questionId: "protection_critical", dimension: "protection" as const, field: "criticalIllness", value: "none", skipped: false },
    { questionId: "cashflow_income_range", dimension: "cashflow" as const, field: "annualIncomeRange", value: "60_100", skipped: false },
  ],
  triage: { primaryDomain: "inheritance" as const, secondaryDomain: null, confidence: 0.8, signals: [] },
  input: { annualIncome: 800000, annualExpense: 400000, liquidAssets: 200000, totalAssets: 2000000, totalDebt: 500000 },
};

test("builds full report with disclaimer", () => {
  const report = buildReport(base);
  assert.equal(report.disclaimer.includes("不构成保险产品推荐"), true);
  assert.equal(report.wealthIndices.length, 5);
  assert.ok(report.topRisks.length <= 5);
});

test("free report trims top risks and removes action plan", () => {
  const full = buildReport(base);
  const free = toFreeReport(full);
  assert.ok((free.topRisks.length ?? 0) <= 3);
  assert.equal(free.actionPlan.length, 0);
});

test("budget range is derived from annual expense", () => {
  const report = buildReport(base);
  assert.ok(report.budgetRange.min !== null && report.budgetRange.max !== null);
  assert.equal(report.budgetRange.disclaimer, "预算参考，非保费报价，非产品推荐");
});

test("reportToText is copyable", () => {
  const text = reportToText(buildReport(base));
  assert.ok(text.includes("AI家庭风险测评报告"));
  assert.ok(text.includes("安全指数"));
});
```

- [ ] **Step 2: 写 `report.ts`**

```ts
import { calcAllIndices, type IndexInput } from "./indices";
import { buildRiskItems } from "./risk-rules";
import type { Answer, CheckupReport, TriageResult } from "./types";

const DISCLAIMER = "本报告由 AI 辅助生成，仅供风险自查参考，不构成保险产品推荐、投保建议或法律意见。最终方案请以保险公司正式条款和专业人士意见为准。";

function answerLabel(answers: Answer[], questionId: string, labels: Record<string, string>): string {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer || answer.skipped) return "信息不足";
  return labels[answer.value] ?? answer.value;
}

export function buildProfile(answers: Answer[]): CheckupReport["profile"] {
  const household = answerLabel(answers, "family_members", {
    couple: "夫妻两人", children: "夫妻与孩子", three_gen: "三代同堂", other: "其他",
  });
  const children = answerLabel(answers, "family_children", {
    school: "孩子还在上学", working: "孩子已工作未婚", married: "孩子已结婚", none: "还没有孩子",
  });
  return {
    familyStructure: `家庭结构：${household}；${children}`,
    lifeStage: "家庭成长期 / 责任期",
    summary: "本次测评基于你主动提供的信息，未提供的数据按「信息不足」处理。",
  };
}

export function buildBudgetRange(input: IndexInput): CheckupReport["budgetRange"] {
  if (typeof input.annualIncome !== "number" || typeof input.annualExpense !== "number") {
    return { min: null, max: null, basis: "信息不足", disclaimer: "预算参考，非保费报价，非产品推荐" };
  }
  const surplus = Math.max(0, input.annualIncome - input.annualExpense);
  return {
    min: Math.round((surplus * 0.1) / 1000) * 1000,
    max: Math.round((surplus * 0.2) / 1000) * 1000,
    basis: "按家庭年结余的 10%–20% 估算",
    disclaimer: "预算参考，非保费报价，非产品推荐",
  };
}

export function buildReport(params: {
  answers: Answer[];
  triage: TriageResult;
  input: IndexInput;
}): CheckupReport {
  const indices = calcAllIndices(params.input);
  const risks = buildRiskItems(params.answers, indices);
  return {
    profile: buildProfile(params.answers),
    wealthIndices: indices,
    topRisks: risks,
    actionPlan: [
      { period: "30 天内", action: "补 3–6 个月家庭应急金，核对现有保单的保障责任", owner: "你与家人" },
      { period: "60 天内", action: "梳理家庭结构图与资产清单，确认给谁、谁管、怎么给", owner: "你" },
      { period: "90 天内", action: "带着报告做一次一对一诊断，核对合同与真实体况", owner: "你与顾问" },
    ],
    budgetRange: buildBudgetRange(params.input),
    nextStep: "报告只是自查参考。想落地，建议预约一次一对一诊断，补充家庭结构、资产和现有保单信息。",
    disclaimer: DISCLAIMER,
  };
}

export function toFreeReport(report: CheckupReport): CheckupReport {
  return {
    ...report,
    topRisks: report.topRisks.slice(0, 3).map((risk) => ({
      ...risk,
      phenomenon: risk.phenomenon.slice(0, 40),
      whyItMatters: "",
      ifIgnored: "",
      suggestedAction: "",
    })),
    actionPlan: [],
    budgetRange: { min: null, max: null, basis: "完整版解锁后查看", disclaimer: "预算参考，非保费报价，非产品推荐" },
  };
}

export function reportToText(report: CheckupReport): string {
  const lines: string[] = ["AI家庭风险测评报告", "", "一、家庭画像", report.profile.familyStructure, report.profile.summary, "", "二、家庭财富平衡 5 大指数"];
  for (const index of report.wealthIndices) {
    lines.push(`- ${index.name}：${index.score === null ? "信息不足" : `${index.score} 分`}`);
  }
  lines.push("", "三、Top 5 风险");
  for (const risk of report.topRisks) {
    lines.push(`- ${risk.title}：${risk.ifIgnored || risk.whyItMatters || ""}`);
  }
  lines.push("", "四、90 天行动清单");
  for (const item of report.actionPlan) lines.push(`- ${item.period}：${item.action}`);
  lines.push("", "五、免责声明", report.disclaimer);
  return lines.join("\n");
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-report.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/report.ts eval/checkup-report.test.ts
git commit -m "feat(checkup): add report builder"
```

**Acceptance:** 完整版含 5 大指数 + Top 5 + 行动清单 + 预算；免费版只留 Top 3 摘要；文案可复制。

---

### Task 10.5: AI 报告增强与降级

**Files:**
- Modify: `src/lib/checkup/report.ts`
- Test: `eval/checkup-report-enhance.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, enhanceReport } from "../src/lib/checkup/report";

const base = {
  answers: [
    { questionId: "family_members", dimension: "family" as const, field: "household", value: "children", skipped: false },
    { questionId: "protection_critical", dimension: "protection" as const, field: "criticalIllness", value: "none", skipped: false },
  ],
  triage: { primaryDomain: "inheritance" as const, secondaryDomain: null, confidence: 0.8, signals: [] },
  input: { annualIncome: 800000, annualExpense: 400000 },
};

test("AI can improve the summary but not the index scores", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => JSON.stringify({
    profile: { summary: "AI 改写后的摘要" },
    topRisks: draft.topRisks,
    actionPlan: draft.actionPlan,
    nextStep: draft.nextStep,
  }));
  assert.equal(enhanced.profile.summary, "AI 改写后的摘要");
  assert.deepEqual(enhanced.wealthIndices, draft.wealthIndices);
});

test("invalid AI output falls back to the draft", async () => {
  const draft = buildReport(base);
  const enhanced = await enhanceReport(draft, async () => "not json");
  assert.equal(enhanced.profile.summary, draft.profile.summary);
});
```

- [ ] **Step 2: 在 `report.ts` 实现**

```ts
import { buildReportUserPrompt } from "./prompts";

export async function enhanceReport(
  draft: CheckupReport,
  callAI: (prompt: string) => Promise<string>,
): Promise<CheckupReport> {
  try {
    const raw = await callAI(buildReportUserPrompt({
      profile: draft.profile.summary,
      indices: draft.wealthIndices,
      risks: draft.topRisks,
      answers: [],
    }));
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<CheckupReport>;
    return {
      ...draft,
      profile: { ...draft.profile, ...(parsed.profile ?? {}) },
      topRisks: Array.isArray(parsed.topRisks) && parsed.topRisks.length > 0 ? parsed.topRisks.slice(0, 5) : draft.topRisks,
      actionPlan: Array.isArray(parsed.actionPlan) && parsed.actionPlan.length > 0 ? parsed.actionPlan : draft.actionPlan,
      nextStep: typeof parsed.nextStep === "string" && parsed.nextStep.trim() ? parsed.nextStep : draft.nextStep,
    };
  } catch {
    return draft;
  }
}
```

> 指数分数只来自规则计算，AI 只能改文案，不能改分数。

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-report-enhance.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/report.ts eval/checkup-report-enhance.test.ts
git commit -m "feat(checkup): add AI report enhancement with fallback"
```

**Acceptance:** AI 改写文案；失败自动降级；5 大指数分数不被 AI 修改。

---

### Task 11: C 端合规守卫

**Files:**
- Create: `src/lib/checkup/compliance.ts`
- Test: `eval/checkup-compliance.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { scanCheckupCompliance, ensureCheckupCompliance } from "../src/lib/checkup/compliance";

test("catches product names", () => {
  const risks = scanCheckupCompliance("建议买友邦传世无忧，再配国寿的年金。");
  assert.ok(risks.some((risk) => risk.code === "product_name"));
});

test("catches premium quotes", () => {
  const risks = scanCheckupCompliance("这款产品每年保费 3 万，现价第 5 年回本。");
  assert.ok(risks.some((risk) => risk.code === "premium_quote"));
});

test("catches guarantees and fear", () => {
  const risks = scanCheckupCompliance("保证领取，稳赚不赔；再不买就晚了。");
  assert.ok(risks.some((risk) => risk.code === "guarantee"));
  assert.ok(risks.some((risk) => risk.code === "fear"));
});

test("safe text passes", () => {
  assert.equal(scanCheckupCompliance("建议先核对合同责任和现金价值，具体以正式条款为准。").length, 0);
});

test("compliance guard rewrites risky text", async () => {
  const result = await ensureCheckupCompliance("保证领取，稳赚不赔。", async () => "建议以合同载明的保证利益为准，不承诺收益。");
  assert.equal(result.rewritten, true);
  assert.ok(result.content.includes("不承诺收益"));
});
```

- [ ] **Step 2: 写 `compliance.ts`**

```ts
export type CheckupComplianceCode =
  | "product_name"
  | "premium_quote"
  | "guarantee"
  | "claim"
  | "peer_blame"
  | "underwriting"
  | "fear"
  | "legal_advice";

export interface CheckupComplianceRisk {
  code: CheckupComplianceCode;
  label: string;
  evidence: string;
}

const RULES: Array<{ code: CheckupComplianceCode; label: string; pattern: RegExp }> = [
  { code: "product_name", label: "产品/公司名称", pattern: /友邦|国寿|平安|太保|泰康|复星|万欣和|传世无忧|欣享人生|光辉岁月|医路相伴/ },
  { code: "premium_quote", label: "保费/费率/现价/收益演示", pattern: /保费|费率|现价|年化|收益演示|回本|领取金额/ },
  { code: "guarantee", label: "收益或领取承诺", pattern: /稳赚|保本|保证领取|一定增值|肯定增值|不会亏/ },
  { code: "claim", label: "理赔结果承诺", pattern: /一定赔|保证理赔|理赔没问题|肯定能赔/ },
  { code: "peer_blame", label: "贬低同业", pattern: /原代理人.{0,8}没讲清楚|别家.{0,6}不好|其他公司.{0,6}骗人/ },
  { code: "underwriting", label: "核保结论预判", pattern: /顶多加费|肯定承保|一定标准体/ },
  { code: "fear", label: "恐吓/焦虑表达", pattern: /再不买就晚了|出事了就完了|连生病资格都没有/ },
  { code: "legal_advice", label: "法律结论", pattern: /一定有效|肯定能避债|保证不会被分走/ },
];

export function scanCheckupCompliance(content: string): CheckupComplianceRisk[] {
  const risks: CheckupComplianceRisk[] = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    for (const rule of RULES) {
      if (risks.some((risk) => risk.code === rule.code)) continue;
      const match = rule.pattern.exec(line);
      if (!match) continue;
      risks.push({ code: rule.code, label: rule.label, evidence: line.slice(0, 120) });
    }
  }
  return risks;
}

export function buildCheckupRewritePrompt(risks: CheckupComplianceRisk[]): string {
  return `你上一版报告出现以下合规风险：${risks.map((risk) => risk.label).join("、")}。请重写完整报告，删除产品名、费率、收益承诺、理赔承诺、同业贬低、核保预判、恐吓表达和法律结论；保留风险判断与行动建议。`;
}

export async function ensureCheckupCompliance(
  content: string,
  rewrite: (prompt: string) => Promise<string>,
): Promise<{ content: string; rewritten: boolean; risks: CheckupComplianceRisk[] }> {
  const risks = scanCheckupCompliance(content);
  if (risks.length === 0) return { content, rewritten: false, risks: [] };
  const rewrittenContent = (await rewrite(buildCheckupRewritePrompt(risks))).trim();
  if (rewrittenContent && scanCheckupCompliance(rewrittenContent).length === 0) {
    return { content: rewrittenContent, rewritten: true, risks };
  }
  return {
    content: "本次报告涉及需要人工核对的内容。建议先核对合同条款、现金价值表、核保资料或理赔材料，再进行针对性沟通。以上不构成保险产品推荐或投保建议。",
    rewritten: true,
    risks,
  };
}
```

- [ ] **Step 3: 跑测试并提交**

Run: `npx tsx --test eval/checkup-compliance.test.ts`
Expected: PASS。

```bash
git add src/lib/checkup/compliance.ts eval/checkup-compliance.test.ts
git commit -m "feat(checkup): add C-end compliance guard"
```

**Acceptance:** 8 类风险可识别；安全文案不误报；重写/兜底可用。

---

### Task 12: 数据表与 store

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/lib/checkup/store.ts`
- Test: `eval/checkup-store.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildOrderNo, isOrderExpired, canUnlock } from "../src/lib/checkup/store";

test("order number has CK prefix and date", () => {
  const orderNo = buildOrderNo(new Date("2026-10-28T00:00:00Z"));
  assert.match(orderNo, /^CK-20261028-[A-Z0-9]{8}$/);
});

test("expired order", () => {
  assert.equal(isOrderExpired({ expires_at: "2026-10-28T00:00:00Z" }, new Date("2026-10-28T01:00:00Z")), true);
  assert.equal(isOrderExpired({ expires_at: "2026-10-28T02:00:00Z" }, new Date("2026-10-28T01:00:00Z")), false);
});

test("can unlock only paid order for same session", () => {
  assert.equal(canUnlock({ status: "paid", session_id: "s1" }, "s1"), true);
  assert.equal(canUnlock({ status: "pending", session_id: "s1" }, "s1"), false);
  assert.equal(canUnlock({ status: "paid", session_id: "s2" }, "s1"), false);
});
```

- [ ] **Step 2: 加表到 `src/lib/db.ts`**

在 `initDB()` 末尾加：
```ts
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
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_orders_session ON checkup_orders(session_id)`;
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_appointments_status ON checkup_appointments(status, created_at DESC)`;
  await s`CREATE INDEX IF NOT EXISTS idx_checkup_events_name ON checkup_events(event_name, created_at DESC)`;
```

- [ ] **Step 3: 写 `store.ts`**

```ts
import crypto from "crypto";
import { getDb, rows } from "@/lib/db";

export function buildOrderNo(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `CK-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function isOrderExpired(order: { expires_at: string }, now = new Date()): boolean {
  return new Date(order.expires_at).getTime() < now.getTime();
}

export function canUnlock(order: { status: string; session_id: string }, sessionId: string): boolean {
  return order.status === "paid" && order.session_id === sessionId;
}

export async function createCheckupOrder(input: { openid: string; sessionId: string }) {
  const sql = getDb();
  const orderNo = buildOrderNo();
  const result = await sql`
    INSERT INTO checkup_orders (order_no, openid, session_id)
    VALUES (${orderNo}, ${input.openid}, ${input.sessionId})
    RETURNING id, order_no, status, expires_at
  `;
  return rows<{ id: number; order_no: string; status: string; expires_at: string }>(result)[0];
}

export async function getCheckupOrder(orderNo: string) {
  const sql = getDb();
  const result = await sql`SELECT * FROM checkup_orders WHERE order_no = ${orderNo}`;
  return rows<Record<string, unknown>>(result)[0] ?? null;
}

export async function markCheckupOrderPaid(orderNo: string, paymentRef: string) {
  const sql = getDb();
  const result = await sql`
    UPDATE checkup_orders SET status = 'paid', payment_ref = ${paymentRef}, paid_at = NOW()
    WHERE order_no = ${orderNo} AND status = 'pending'
    RETURNING order_no
  `;
  return rows<{ order_no: string }>(result).length > 0;
}

export async function createCheckupAppointment(input: {
  nameEnc: string; phoneEnc: string; timeWindow: string; question: string; openid: string;
}) {
  const sql = getDb();
  const result = await sql`
    INSERT INTO checkup_appointments (name_enc, phone_enc, time_window, question, openid)
    VALUES (${input.nameEnc}, ${input.phoneEnc}, ${input.timeWindow}, ${input.question}, ${input.openid})
    RETURNING id
  `;
  return rows<{ id: number }>(result)[0];
}

export async function listCheckupAppointments() {
  const sql = getDb();
  const result = await sql`SELECT * FROM checkup_appointments ORDER BY created_at DESC LIMIT 200`;
  return rows<Record<string, unknown>>(result);
}

export async function recordCheckupEvent(sessionId: string, eventName: string, payload: Record<string, unknown> = {}) {
  const sql = getDb();
  await sql`
    INSERT INTO checkup_events (session_id, event_name, payload)
    VALUES (${sessionId}, ${eventName}, ${JSON.stringify(payload)})
  `;
}
```

- [ ] **Step 4: 跑测试并提交**

Run: `npx tsx --test eval/checkup-store.test.ts`
Expected: PASS。

```bash
git add src/lib/db.ts src/lib/checkup/store.ts eval/checkup-store.test.ts
git commit -m "feat(checkup): add checkup tables and store"
```

**Acceptance:** 3 张表、索引、订单状态纯函数正确。

---

### Task 13: 公开测评接口（session / answer / preview / event）

**Files:**
- Create: `src/app/api/checkup/session/route.ts`
- Create: `src/app/api/checkup/answer/route.ts`
- Create: `src/app/api/checkup/preview/route.ts`
- Create: `src/app/api/checkup/event/route.ts`

- [ ] **Step 1: 写 `session` 路由**

```ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/checkup/session";
import { recordCheckupEvent } from "@/lib/checkup/store";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:session:${ip}`, "coach");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const sessionId = crypto.randomUUID();
  await recordCheckupEvent(sessionId, "session_start");
  return NextResponse.json({
    sessionToken: createSessionToken(sessionId),
    opening: "你家现在最让你不踏实的是什么？可以先随便说几句，不用想得很完整。",
    topics: ["钱够不够花", "生病怎么办", "孩子教育", "父母养老", "家业传承"],
  });
}
```

- [ ] **Step 2: 写 `answer` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { triageFromText } from "@/lib/checkup/triage";
import { selectNextQuestion, shouldStop, MAX_ROUNDS } from "@/lib/checkup/follow-up";
import { getQuestionById } from "@/lib/checkup/question-bank";
import type { Answer } from "@/lib/checkup/types";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`checkup:answer:${ip}`, "coach");
  if (!rl.allowed) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });

  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期，请重新开始" }, { status: 401 });

  const answers = Array.isArray(body.answers) ? body.answers as Answer[] : [];
  const lastMessage = String(body.lastMessage || "");
  const triage = body.triage || triageFromText(lastMessage || answers.map((a) => a.freeText || "").join(" "));
  const state = { answers, triage, customerWantsReport: Boolean(body.customerWantsReport) };

  if (shouldStop(state)) {
    return NextResponse.json({ done: true, progress: `${Math.min(answers.length, MAX_ROUNDS)}/${MAX_ROUNDS}` });
  }

  const next = selectNextQuestion(state);
  if (!next) return NextResponse.json({ done: true, progress: `${answers.length}/${MAX_ROUNDS}` });

  return NextResponse.json({
    done: false,
    question: next,
    triage,
    progress: `${answers.length}/${MAX_ROUNDS}`,
  });
}
```

- [ ] **Step 3: 写 `preview` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { buildReport, toFreeReport } from "@/lib/checkup/report";
import { triageFromText } from "@/lib/checkup/triage";
import { recordCheckupEvent } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const triage = triageFromText(answers.map((a: { freeText?: string; value?: string }) => `${a.freeText ?? ""} ${a.value ?? ""}`).join(" "));
  const report = toFreeReport(buildReport({ answers, triage, input: body.indexInput ?? {} }));
  await recordCheckupEvent(payload.sessionId, "preview_shown");
  return NextResponse.json({ report, sessionId: payload.sessionId });
}
```

- [ ] **Step 4: 写 `event` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/checkup/session";
import { recordCheckupEvent } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ ok: false }, { status: 401 });
  const eventName = String(body.eventName || "").slice(0, 40);
  if (!eventName) return NextResponse.json({ ok: false }, { status: 400 });
  await recordCheckupEvent(payload.sessionId, eventName, body.payload ?? {});
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: 本地验证并提交**

Run:
```bash
npm run lint
npm run dev
# 另一个终端：
curl -s -X POST http://localhost:3000/api/checkup/session
```
Expected: 返回 `sessionToken`、`opening`。

```bash
git add src/app/api/checkup/session/route.ts src/app/api/checkup/answer/route.ts src/app/api/checkup/preview/route.ts src/app/api/checkup/event/route.ts
git commit -m "feat(checkup): add public checkup APIs"
```

**Acceptance:** session 返回令牌；answer 返回下一题或 done；preview 返回免费报告；event 写入匿名事件。

---

### Task 14: 订单、支付、解锁接口

**Files:**
- Modify: `src/lib/wechatpay.ts`（`createJSAPIPrepay` 支持 `notifyUrl`）
- Create: `src/app/api/checkup/order/route.ts`
- Create: `src/app/api/checkup/order/status/route.ts`
- Create: `src/app/api/checkup/unlock/route.ts`
- Create: `src/app/api/checkup/pay/notify/route.ts`
- Create: `src/app/api/checkup/pay/mock/route.ts`

- [ ] **Step 1: 改 `wechatpay.ts`**

把：
```ts
notify_url: "https://baojiaolian.com.cn/api/payment/notify",
```
改为：
```ts
notify_url: params.notifyUrl || "https://baojiaolian.com.cn/api/payment/notify",
```
并在参数类型中加 `notifyUrl?: string`。

- [ ] **Step 2: 写 `order` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, rows } from "@/lib/db";
import { verifySessionToken } from "@/lib/checkup/session";
import { createCheckupOrder, recordCheckupEvent } from "@/lib/checkup/store";
import { createJSAPIPrepay, generatePayParams } from "@/lib/wechatpay";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const rl = rateLimit(`checkup:order:${session.userId}`, "payment");
  if (!rl.allowed) return NextResponse.json({ error: "操作过于频繁" }, { status: 429 });

  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT wechat_openid FROM users WHERE id = ${session.userId}`;
  const openid = rows<{ wechat_openid: string | null }>(userRows)[0]?.wechat_openid;
  if (!openid) return NextResponse.json({ error: "缺少微信身份" }, { status: 400 });

  const order = await createCheckupOrder({ openid, sessionId: payload.sessionId });
  await recordCheckupEvent(payload.sessionId, "order_created");
  const prepay = await createJSAPIPrepay({
    openid,
    description: "AI家庭风险测评报告",
    outTradeNo: order.order_no,
    amountCents: 100,
    notifyUrl: "https://baojiaolian.com.cn/api/checkup/pay/notify",
  });
  return NextResponse.json({ orderNo: order.order_no, payParams: generatePayParams(prepay.prepay_id) });
}
```

- [ ] **Step 3: 写 `order/status` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCheckupOrder } from "@/lib/checkup/store";

export async function GET(request: NextRequest) {
  const orderNo = request.nextUrl.searchParams.get("orderNo") || "";
  const order = await getCheckupOrder(orderNo);
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  return NextResponse.json({ status: order.status });
}
```

- [ ] **Step 4: 写 `unlock` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifySessionToken } from "@/lib/checkup/session";
import { getCheckupOrder, canUnlock, recordCheckupEvent } from "@/lib/checkup/store";
import { buildReport, enhanceReport, reportToText } from "@/lib/checkup/report";
import { triageFromText } from "@/lib/checkup/triage";
import { scanCheckupCompliance } from "@/lib/checkup/compliance";
import { getAIClient, noThinkingConfig } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await request.json();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  if (!payload) return NextResponse.json({ error: "会话已过期" }, { status: 401 });

  const order = await getCheckupOrder(String(body.orderNo || ""));
  if (!order || !canUnlock(order as { status: string; session_id: string }, payload.sessionId)) {
    return NextResponse.json({ error: "订单未支付或已失效" }, { status: 402 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  const triage = triageFromText(answers.map((a: { freeText?: string; value?: string }) => `${a.freeText ?? ""} ${a.value ?? ""}`).join(" "));
  const draft = buildReport({ answers, triage, input: body.indexInput ?? {} });
  const enhanced = await enhanceReport(draft, async (prompt) => {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });
    return completion.choices[0]?.message?.content || "";
  });
  const risks = scanCheckupCompliance(reportToText(enhanced));
  const report = risks.length > 0 ? draft : enhanced;
  await recordCheckupEvent(payload.sessionId, "report_unlocked");
  return NextResponse.json({ report, complianceRisks: risks.map((risk) => risk.code) });
}
```

- [ ] **Step 5: 写 `pay/notify` 路由（参考现有 `src/app/api/payment/notify/route.ts`）**

关键要求：
1. 读取原始 body，调用 `verifyNotifySign` 验签。
2. 调用 `decryptNotify` 解密 resource。
3. 取 `out_trade_no`、`transaction_id`，调用 `markCheckupOrderPaid`。
4. 幂等：已 paid 直接返回成功。
5. 返回微信要求的 `{ code: "SUCCESS", message: "成功" }`。
6. 打印日志时只打印 orderNo，不打印 body。

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyNotifySign, decryptNotify } from "@/lib/wechatpay";
import { markCheckupOrderPaid } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const timestamp = request.headers.get("wechatpay-timestamp") || "";
  const nonce = request.headers.get("wechatpay-nonce") || "";
  const signature = request.headers.get("wechatpay-signature") || "";
  if (!verifyNotifySign(timestamp, nonce, raw, signature)) {
    return NextResponse.json({ code: "FAIL", message: "签名校验失败" }, { status: 401 });
  }
  const parsed = JSON.parse(raw) as { resource: { ciphertext: string; associated_data: string; nonce: string } };
  const resource = JSON.parse(decryptNotify(parsed.resource.ciphertext, parsed.resource.associated_data, parsed.resource.nonce)) as {
    out_trade_no: string;
    trade_state: string;
    transaction_id: string;
  };
  if (resource.trade_state === "SUCCESS") {
    await markCheckupOrderPaid(resource.out_trade_no, resource.transaction_id);
  }
  return NextResponse.json({ code: "SUCCESS", message: "成功" });
}
```

- [ ] **Step 6: 写 `pay/mock` 路由（仅开发）**

```ts
import { NextRequest, NextResponse } from "next/server";
import { markCheckupOrderPaid } from "@/lib/checkup/store";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { orderNo } = await request.json();
  await markCheckupOrderPaid(String(orderNo), "mock");
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: 本地验证并提交**

Run:
```bash
npm run lint
npm run dev
# 先 session，再 order（需要登录态；开发环境可用手机号 1234 登录拿 cookie）
```
Expected: `order` 返回 `payParams`；`pay/mock` 后 `order/status` 为 `paid`；`unlock` 返回完整报告。

```bash
git add src/lib/wechatpay.ts src/app/api/checkup/order/route.ts src/app/api/checkup/order/status/route.ts src/app/api/checkup/unlock/route.ts src/app/api/checkup/pay/notify/route.ts src/app/api/checkup/pay/mock/route.ts
git commit -m "feat(checkup): add order, payment and unlock APIs"
```

**Acceptance:** 1 元订单可创建；mock 支付后能解锁；回调幂等；生产环境 mock 路由 404。

---

### Task 15: 预约与后台接口

**Files:**
- Create: `src/app/api/checkup/appointment/route.ts`
- Create: `src/app/api/admin/checkup/appointments/route.ts`
- Create: `src/app/api/admin/checkup/stats/route.ts`

- [ ] **Step 1: 写 `appointment` 路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { createCheckupAppointment, recordCheckupEvent } from "@/lib/checkup/store";
import { rateLimit } from "@/lib/rate-limit";
import { verifySessionToken } from "@/lib/checkup/session";

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

export async function POST(request: NextRequest) {
  const rl = rateLimit("checkup:appointment", "payment");
  if (!rl.allowed) return NextResponse.json({ error: "操作过于频繁" }, { status: 429 });
  const body = await request.json();
  const name = String(body.name || "").trim().slice(0, 20);
  const phone = String(body.phone || "").trim();
  const timeWindow = String(body.timeWindow || "").trim().slice(0, 40);
  const question = String(body.question || "").trim().slice(0, 200);
  if (!name || !isValidPhone(phone) || !timeWindow) {
    return NextResponse.json({ error: "请填写称呼、手机号和方便时间" }, { status: 400 });
  }
  const session = await getSession();
  const payload = verifySessionToken(String(body.sessionToken || ""));
  const appointment = await createCheckupAppointment({
    nameEnc: encrypt(name),
    phoneEnc: encrypt(phone),
    timeWindow,
    question,
    openid: session.userId ? String(session.userId) : "",
  });
  if (payload) await recordCheckupEvent(payload.sessionId, "booking_created", {});
  return NextResponse.json({ ok: true, id: appointment.id });
}
```

- [ ] **Step 2: 写 admin 预约列表**

```ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminKeyValid } from "@/lib/security";
import { decrypt } from "@/lib/crypto";
import { listCheckupAppointments } from "@/lib/checkup/store";

export async function GET(request: NextRequest) {
  if (!isAdminKeyValid(request.headers.get("x-admin-key"))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const rows = await listCheckupAppointments();
  return NextResponse.json({
    appointments: rows.map((row) => ({
      id: row.id,
      name: decrypt(String(row.name_enc || "")),
      phone: decrypt(String(row.phone_enc || "")),
      timeWindow: row.time_window,
      question: row.question,
      status: row.status,
      createdAt: row.created_at,
    })),
  });
}
```

- [ ] **Step 3: 写 admin 统计**

```ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminKeyValid } from "@/lib/security";
import { getDb, rows } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isAdminKeyValid(request.headers.get("x-admin-key"))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sql = getDb();
  const events = rows<{ event_name: string; count: number }>(
    await sql`SELECT event_name, COUNT(*)::int AS count FROM checkup_events GROUP BY event_name ORDER BY count DESC`,
  );
  const orders = rows<{ status: string; count: number }>(
    await sql`SELECT status, COUNT(*)::int AS count FROM checkup_orders GROUP BY status`,
  );
  return NextResponse.json({ events, orders });
}
```

- [ ] **Step 4: 跑 lint 并提交**

Run: `npm run lint`
Expected: PASS。

```bash
git add src/app/api/checkup/appointment/route.ts src/app/api/admin/checkup/appointments/route.ts src/app/api/admin/checkup/stats/route.ts
git commit -m "feat(checkup): add appointment and admin APIs"
```

**Acceptance:** 预约写入加密；后台需 `x-admin-key`；能解密展示。

---

### Task 16: 小程序外壳、登录与本地存储

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/app.js`
- Modify: `miniprogram/utils/api.js`
- Create: `miniprogram/utils/storage.js`

- [ ] **Step 1: 改 `app.json`**

```json
{
  "lazyCodeLoading": "requiredComponents",
  "pages": [
    "pages/index/index",
    "pages/chat/chat",
    "pages/report/report",
    "pages/booking/booking",
    "pages/about/about"
  ],
  "window": {
    "navigationBarBackgroundColor": "#1a56db",
    "navigationBarTitleText": "AI家庭风险测评",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f5f5f5"
  },
  "plugins": {
    "WechatSI": { "version": "0.3.6", "provider": "wx069ba97219f66d99" }
  },
  "permission": { "scope.record": { "desc": "用于语音输入测评回答" } }
}
```

- [ ] **Step 2: 改 `app.js`**

在 `globalData` 后加 `silentLogin()`；`onLaunch` 改为先 `silentLogin()` 再 `autoLogin()`：
```js
  async silentLogin() {
    try {
      var token = auth.getToken();
      if (token) return token;
      var codeRes = await wx.login();
      var res = await this.request("/api/auth/wechat-login", { method: "POST", data: { code: codeRes.code } });
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data.token) {
        auth.setToken(res.data.token);
        this.globalData.userInfo = res.data.user;
        this.globalData.isLogin = true;
        return res.data.token;
      }
    } catch (e) {
      console.warn("[silentLogin] failed", e && e.message);
    }
    return "";
  },
```
`onLaunch`：
```js
  onLaunch() {
    this.silentLogin().then(() => this.autoLogin());
  },
```

- [ ] **Step 3: 改 `utils/api.js`，加 checkup 方法**

```js
module.exports.checkup = {
  start: function () { return request("/api/checkup/session", { method: "POST" }); },
  answer: function (data) { return request("/api/checkup/answer", { method: "POST", data: data }); },
  preview: function (data) { return request("/api/checkup/preview", { method: "POST", data: data }); },
  createOrder: function (data) { return request("/api/checkup/order", { method: "POST", data: data }); },
  orderStatus: function (orderNo) { return request("/api/checkup/order/status?orderNo=" + orderNo, { method: "GET" }); },
  unlock: function (data) { return request("/api/checkup/unlock", { method: "POST", data: data }); },
  appointment: function (data) { return request("/api/checkup/appointment", { method: "POST", data: data }); },
  event: function (data) { return request("/api/checkup/event", { method: "POST", data: data }); },
};
```

- [ ] **Step 4: 写 `utils/storage.js`**

```js
var HISTORY_KEY = "checkup_history";
var PREVIEW_KEY = "checkup_report_preview";
var FULL_KEY = "checkup_report_full";
var ORDER_KEY = "checkup_order";

function save(key, value) {
  try { wx.setStorageSync(key, value); } catch (e) { /* ignore */ }
}
function load(key, fallback) {
  try { return wx.getStorageSync(key) || fallback; } catch (e) { return fallback; }
}
function clearAll() {
  [HISTORY_KEY, PREVIEW_KEY, FULL_KEY, ORDER_KEY].forEach(function (key) {
    try { wx.removeStorageSync(key); } catch (e) { /* ignore */ }
  });
}
module.exports = {
  HISTORY_KEY: HISTORY_KEY,
  PREVIEW_KEY: PREVIEW_KEY,
  FULL_KEY: FULL_KEY,
  ORDER_KEY: ORDER_KEY,
  save: save,
  load: load,
  clearAll: clearAll,
};
```

- [ ] **Step 5: 跑 lint 并提交**

Run: `npm run lint`（小程序是 JS，不影响 TS；如 eslint 不存在则手动检查 JSON）。
```bash
git add miniprogram/app.json miniprogram/app.js miniprogram/utils/api.js miniprogram/utils/storage.js
git commit -m "feat(checkup): add mini program shell and storage"
```

**Acceptance:** 小程序启动即静默登录；页面清单正确；本地存储生效。

---

### Task 17: 首页

**Files:**
- Create: `miniprogram/pages/index/index.js`
- Create: `miniprogram/pages/index/index.wxml`
- Create: `miniprogram/pages/index/index.wxss`
- Create: `miniprogram/pages/index/index.json`

- [ ] **Step 1: 写 `index.js`**

```js
var api = require("../../utils/api");
Page({
  data: { starting: false },
  onStart: function () {
    var self = this;
    if (self.data.starting) return;
    self.setData({ starting: true });
    api.checkup.start().then(function (res) {
      wx.setStorageSync("checkup_session", res.sessionToken);
      wx.setStorageSync("checkup_triage", null);
      wx.navigateTo({ url: "/pages/chat/chat" });
    }).catch(function () {
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
    }).then(function () {
      self.setData({ starting: false });
    });
  },
  onAbout: function () {
    wx.navigateTo({ url: "/pages/about/about" });
  },
});
```

- [ ] **Step 2: 写 `index.wxml`**

```xml
<view class="page">
  <view class="hero">
    <text class="title">AI家庭风险测评</text>
    <text class="subtitle">10 分钟，看清你家最该先处理的风险</text>
  </view>
  <view class="intro">
    <text>我是樊家浩，过去 4 年做京东运营，现在专注结合 AI 做家庭风险和传承，定位是「财富安全风险架构师」。</text>
    <text>很多客户不愿意一上来就把家里情况告诉代理人，所以我把它做成一个可以匿名使用的测评。你的回答不会被保存，只会存在你自己的手机上。</text>
  </view>
  <view class="card">
    <text class="card-title">测什么</text>
    <text>家庭结构、已有保障、收支与资产、婚姻与传承安排。不推销、不承诺，只给风险判断。</text>
  </view>
  <button class="primary" bindtap="onStart" loading="{{starting}}">开始测评</button>
  <view class="privacy" bindtap="onAbout">隐私说明 · 免责声明</view>
</view>
```

- [ ] **Step 3: 写 `index.wxss`**

```css
.page { padding: 48rpx 32rpx; background: #f7f8fa; min-height: 100vh; }
.hero { margin-bottom: 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 700; color: #111827; }
.subtitle { display: block; margin-top: 16rpx; font-size: 30rpx; color: #6b7280; }
.intro { background: #fff; border-radius: 20rpx; padding: 28rpx; font-size: 28rpx; line-height: 1.8; color: #374151; }
.intro text { display: block; margin-bottom: 12rpx; }
.card { margin-top: 24rpx; background: #fff; border-radius: 20rpx; padding: 28rpx; }
.card-title { display: block; font-weight: 600; margin-bottom: 12rpx; }
.primary { margin-top: 48rpx; background: #1a56db; color: #fff; border-radius: 999rpx; }
.privacy { margin-top: 24rpx; text-align: center; font-size: 26rpx; color: #9ca3af; }
```

- [ ] **Step 4: 写 `index.json`**

```json
{ "navigationBarTitleText": "AI家庭风险测评" }
```

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/index
git commit -m "feat(checkup): add mini program welcome page"
```

**Acceptance:** 首页可打开；点「开始测评」创建会话并进入 chat。

---

### Task 18: 测评对话页（先听后问 + 选项 + 跳过 + 直接出报告）

**Files:**
- Create: `miniprogram/pages/chat/chat.js`
- Create: `miniprogram/pages/chat/chat.wxml`
- Create: `miniprogram/pages/chat/chat.wxss`
- Create: `miniprogram/pages/chat/chat.json`

- [ ] **Step 1: 写 `chat.js`**

```js
var api = require("../../utils/api");
var storage = require("../../utils/storage");

Page({
  data: {
    messages: [],
    currentQuestion: null,
    answers: [],
    progress: "0/12",
    loading: false,
    inputValue: "",
    canRetry: false,
  },
  onLoad: function () {
    var token = wx.getStorageSync("checkup_session");
    if (!token) {
      wx.redirectTo({ url: "/pages/index/index" });
      return;
    }
    var history = storage.load(storage.HISTORY_KEY, []);
    if (history.length > 0) {
      this.setData({ messages: history, answers: storage.load("checkup_answers", []) });
      this.ask({ resume: true });
    } else {
      this.setData({ messages: [{ role: "assistant", text: "你家现在最让你不踏实的是什么？可以先随便说几句，不用想得很完整。" }] });
    }
  },
  onInput: function (e) { this.setData({ inputValue: e.detail.value }); },
  onSendText: function () {
    var text = (this.data.inputValue || "").trim();
    if (!text) return;
    this.setData({
      messages: this.data.messages.concat([{ role: "user", text: text }]),
      inputValue: "",
    });
    this.ask({ lastMessage: text, freeText: text });
  },
  onOption: function (e) {
    var option = e.currentTarget.dataset.option;
    var question = this.data.currentQuestion;
    if (!question) return;
    this.setData({ messages: this.data.messages.concat([{ role: "user", text: option.label }]) });
    var answer = { questionId: question.id, dimension: question.dimension, field: question.field, value: option.value, skipped: false };
    this.ask({ answer: answer });
  },
  onSkip: function () {
    var question = this.data.currentQuestion;
    if (!question) return;
    this.setData({ messages: this.data.messages.concat([{ role: "user", text: "这个先跳过" }]) });
    this.ask({ answer: { questionId: question.id, dimension: question.dimension, field: question.field, value: "skip", skipped: true } });
  },
  onReportNow: function () {
    this.ask({ customerWantsReport: true });
  },
  ask: function (payload) {
    var self = this;
    if (self.data.loading) return;
    self.setData({ loading: true });
    var answers = self.data.answers.slice();
    if (payload.answer) answers.push(payload.answer);
    api.checkup.answer({
      sessionToken: wx.getStorageSync("checkup_session"),
      answers: answers,
      lastMessage: payload.lastMessage || "",
      customerWantsReport: Boolean(payload.customerWantsReport),
      triage: wx.getStorageSync("checkup_triage") || null,
    }).then(function (res) {
      storage.save("checkup_answers", answers);
      storage.save(storage.HISTORY_KEY, self.data.messages);
      if (res.done) {
        self.goPreview(answers);
        return;
      }
      wx.setStorageSync("checkup_triage", res.triage);
      self.setData({
        answers: answers,
        currentQuestion: res.question,
        progress: res.progress,
        messages: payload.resume
          ? self.data.messages
          : self.data.messages.concat([{ role: "assistant", text: res.question.prompt }]),
      });
      storage.save(storage.HISTORY_KEY, self.data.messages);
    }).catch(function () {
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
      self.setData({ canRetry: true });
    }).then(function () {
      self.setData({ loading: false });
    });
  },
  goPreview: function (answers) {
    var self = this;
    api.checkup.preview({
      sessionToken: wx.getStorageSync("checkup_session"),
      answers: answers,
      indexInput: self.buildIndexInput(answers),
    }).then(function (res) {
      storage.save(storage.PREVIEW_KEY, res.report);
      wx.navigateTo({ url: "/pages/report/report" });
    }).catch(function () {
      wx.showToast({ title: "生成报告失败，请重试", icon: "none" });
    });
  },
  buildIndexInput: function (answers) {
    // 只从客户主动提供的区间题里取中位数；缺失就留空，报告标「信息不足」
    var ranges = {
      under30: 25, "30_60": 45, "60_100": 80, over100: 120,
      under10: 8, "10_30": 20, "30_50": 40, over50: 60,
      under50: 40, "50_100": 75, "100_300": 200, over300: 400,
      none: 0,
    };
    var get = function (id) {
      var a = answers.filter(function (x) { return x.questionId === id; })[0];
      return a && !a.skipped ? ranges[a.value] : null;
    };
    return { annualIncome: get("cashflow_income_range"), annualExpense: get("cashflow_expense_range") };
  },
});
```

- [ ] **Step 2: 写 `chat.wxml`**

```xml
<view class="page">
  <view class="progress">进度 {{progress}}</view>
  <scroll-view class="messages" scroll-y>
    <view wx:for="{{messages}}" wx:key="index" class="bubble {{item.role}}">
      <text>{{item.text}}</text>
    </view>
    <view wx:if="{{loading}}" class="bubble assistant"><text>正在想下一个问题…</text></view>
  </scroll-view>
  <view wx:if="{{currentQuestion}}" class="options">
    <view wx:for="{{currentQuestion.options}}" wx:key="value" class="option" data-option="{{item}}" bindtap="onOption">
      <text>{{item.label}}</text>
    </view>
    <view class="actions">
      <text class="link" bindtap="onSkip">不想说，跳过</text>
      <text class="link" bindtap="onReportNow">直接出报告</text>
    </view>
  </view>
  <view class="input-row">
    <input value="{{inputValue}}" bindinput="onInput" placeholder="也可以直接打字说…" />
    <button size="mini" bindtap="onSendText">发送</button>
  </view>
</view>
```

- [ ] **Step 3: 写 `chat.wxss`**

```css
.page { display: flex; flex-direction: column; height: 100vh; background: #f7f8fa; }
.progress { padding: 16rpx 32rpx; font-size: 24rpx; color: #9ca3af; }
.messages { flex: 1; padding: 16rpx 32rpx; }
.bubble { max-width: 80%; padding: 20rpx 24rpx; border-radius: 18rpx; margin-bottom: 16rpx; font-size: 28rpx; line-height: 1.7; }
.assistant { background: #fff; color: #111827; }
.user { background: #1a56db; color: #fff; margin-left: auto; }
.options { padding: 0 32rpx 16rpx; }
.option { background: #fff; border: 1rpx solid #e5e7eb; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.actions { display: flex; justify-content: space-between; padding: 8rpx 4rpx; }
.link { font-size: 26rpx; color: #6b7280; }
.input-row { display: flex; gap: 16rpx; padding: 20rpx 32rpx 40rpx; background: #fff; }
.input-row input { flex: 1; background: #f3f4f6; border-radius: 999rpx; padding: 0 24rpx; height: 72rpx; }
```

- [ ] **Step 4: 写 `chat.json`**

```json
{ "navigationBarTitleText": "家庭风险测评" }
```

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/chat
git commit -m "feat(checkup): add conversational checkup page"
```

**Acceptance:** 先显示家庭结构问题；可选项/跳过/打字；6–12 轮后进入报告；刷新可继续。

---

### Task 19: 报告页（免费/付费/解锁/复制）

**Files:**
- Create: `miniprogram/pages/report/report.js`
- Create: `miniprogram/pages/report/report.wxml`
- Create: `miniprogram/pages/report/report.wxss`
- Create: `miniprogram/pages/report/report.json`

- [ ] **Step 1: 写 `report.js`**

```js
var api = require("../../utils/api");
var storage = require("../../utils/storage");

Page({
  data: { report: null, full: false, paying: false, orderNo: "" },
  onLoad: function () {
    var preview = storage.load(storage.PREVIEW_KEY, null);
    var full = storage.load(storage.FULL_KEY, null);
    this.setData({ report: full || preview, full: Boolean(full) });
  },
  onPay: function () {
    var self = this;
    if (self.data.paying) return;
    self.setData({ paying: true });
    api.checkup.createOrder({
      sessionToken: wx.getStorageSync("checkup_session"),
    }).then(function (res) {
      self.setData({ orderNo: res.orderNo });
      wx.requestPayment({
        timeStamp: res.payParams.timeStamp,
        nonceStr: res.payParams.nonceStr,
        package: res.payParams.package,
        signType: res.payParams.signType,
        paySign: res.payParams.paySign,
        success: function () { self.pollOrder(res.orderNo); },
        fail: function () { wx.showToast({ title: "支付未完成", icon: "none" }); },
      });
    }).catch(function () {
      wx.showToast({ title: "下单失败，请重试", icon: "none" });
    }).then(function () {
      self.setData({ paying: false });
    });
  },
  pollOrder: function (orderNo) {
    var self = this;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      api.checkup.orderStatus(orderNo).then(function (res) {
        if (res.status === "paid") {
          clearInterval(timer);
          self.unlock(orderNo);
        } else if (tries > 10) {
          clearInterval(timer);
          wx.showToast({ title: "支付确认中，请稍后重试", icon: "none" });
        }
      });
    }, 1500);
  },
  unlock: function (orderNo) {
    var self = this;
    api.checkup.unlock({
      sessionToken: wx.getStorageSync("checkup_session"),
      orderNo: orderNo,
      answers: storage.load("checkup_answers", []),
    }).then(function (res) {
      storage.save(storage.FULL_KEY, res.report);
      self.setData({ report: res.report, full: true });
    }).catch(function () {
      wx.showToast({ title: "解锁失败，请重试", icon: "none" });
    });
  },
  onCopy: function () {
    var text = this.reportText();
    wx.setClipboardData({ data: text });
  },
  reportText: function () {
    var report = this.data.report;
    if (!report) return "";
    var lines = ["AI家庭风险测评报告", "", "家庭画像：" + report.profile.summary, ""];
    (report.wealthIndices || []).forEach(function (index) {
      lines.push(index.name + "：" + (index.score === null ? "信息不足" : index.score + " 分"));
    });
    (report.topRisks || []).forEach(function (risk) { lines.push("· " + risk.title + "：" + (risk.ifIgnored || "")); });
    lines.push("", report.disclaimer);
    return lines.join("\n");
  },
  onBook: function () { wx.navigateTo({ url: "/pages/booking/booking" }); },
});
```

- [ ] **Step 2: 写 `report.wxml`**

```xml
<view class="page" wx:if="{{report}}">
  <view class="header">
    <text class="title">AI家庭风险测评报告</text>
    <text class="sub">{{report.profile.summary}}</text>
  </view>
  <view class="indices">
    <view wx:for="{{report.wealthIndices}}" wx:key="name" class="index-row">
      <text class="index-name">{{item.name}}</text>
      <text class="index-score">{{item.score === null ? '信息不足' : item.score + ' 分'}}</text>
    </view>
  </view>
  <view class="risks">
    <text class="section">Top 风险</text>
    <view wx:for="{{report.topRisks}}" wx:key="title" class="risk">
      <text class="risk-title">{{item.title}}</text>
      <text wx:if="{{full}}" class="risk-body">{{item.phenomenon}} {{item.ifIgnored}} {{item.suggestedAction}}</text>
    </view>
  </view>
  <view wx:if="{{full}}" class="actions">
    <text class="section">90 天行动清单</text>
    <view wx:for="{{report.actionPlan}}" wx:key="action" class="action">{{item.period}}：{{item.action}}</view>
  </view>
  <button wx:if="{{!full}}" class="primary" bindtap="onPay" loading="{{paying}}">1 元解锁完整报告</button>
  <button wx:if="{{full}}" class="secondary" bindtap="onCopy">复制报告文字</button>
  <button wx:if="{{full}}" class="primary" bindtap="onBook">预约一对一诊断</button>
  <text class="disclaimer">{{report.disclaimer}}</text>
</view>
```

- [ ] **Step 3: 写 `report.wxss`**

```css
.page { padding: 32rpx; background: #f7f8fa; min-height: 100vh; }
.title { display: block; font-size: 42rpx; font-weight: 700; }
.sub { display: block; margin-top: 12rpx; font-size: 26rpx; color: #6b7280; }
.indices { margin-top: 24rpx; background: #fff; border-radius: 20rpx; padding: 8rpx 24rpx; }
.index-row { display: flex; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #f3f4f6; }
.section { display: block; margin: 28rpx 0 12rpx; font-weight: 600; }
.risk { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; }
.risk-title { display: block; font-weight: 600; }
.risk-body { display: block; margin-top: 8rpx; font-size: 26rpx; color: #4b5563; line-height: 1.7; }
.primary { margin-top: 32rpx; background: #1a56db; color: #fff; border-radius: 999rpx; }
.secondary { margin-top: 16rpx; background: #fff; color: #1a56db; border: 1rpx solid #1a56db; border-radius: 999rpx; }
.disclaimer { display: block; margin-top: 32rpx; font-size: 22rpx; color: #9ca3af; line-height: 1.6; }
```

- [ ] **Step 4: 写 `report.json`**

```json
{ "navigationBarTitleText": "测评报告" }
```

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/report
git commit -m "feat(checkup): add report page with paywall"
```

**Acceptance:** 免费版显示 5 大指数 + Top3；1 元支付后显示完整版；复制文字可用。

---

### Task 19.5: 保存报告长图（V1 目标，可降级）

**Files:**
- Create: `miniprogram/utils/report-image.js`
- Modify: `miniprogram/pages/report/report.js`
- Modify: `miniprogram/pages/report/report.wxml`

- [ ] **Step 1: 写 `report-image.js`（canvas 2D 简化版）**

```js
function drawReportImage(report, canvasId, page) {
  var ctx = wx.createCanvasContext(canvasId, page);
  var width = 750;
  var y = 40;
  ctx.setFillStyle("#161d27");
  ctx.fillRect(0, 0, width, 2400);
  ctx.setFillStyle("#c9a86a");
  ctx.setFontSize(40);
  ctx.fillText("AI家庭风险测评报告", 40, y); y += 60;
  ctx.setFillStyle("#e8e0cf");
  ctx.setFontSize(24);
  ctx.fillText(((report.profile && report.profile.summary) || "").slice(0, 60), 40, y); y += 50;
  (report.wealthIndices || []).forEach(function (item) {
    ctx.fillText(item.name + "：" + (item.score === null ? "信息不足" : item.score + " 分"), 40, y); y += 44;
  });
  y += 20;
  (report.topRisks || []).forEach(function (risk) {
    ctx.setFillStyle("#c9a86a");
    ctx.fillText(risk.title, 40, y); y += 36;
    ctx.setFillStyle("#e8e0cf");
    ctx.fillText((risk.ifIgnored || "").slice(0, 48), 40, y); y += 40;
  });
  ctx.setFillStyle("#8fa0b3");
  ctx.setFontSize(20);
  ctx.fillText((report.disclaimer || "").slice(0, 80), 40, y);
  ctx.draw(false, function () {
    setTimeout(function () {
      wx.canvasToTempFilePath({
        canvasId: canvasId,
        success: function (res) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: function () { wx.showToast({ title: "已保存到相册", icon: "success" }); },
            fail: function () { wx.showToast({ title: "保存失败，可复制文字", icon: "none" }); },
          });
        },
      }, page);
    }, 300);
  });
}

module.exports = { drawReportImage: drawReportImage };
```

- [ ] **Step 2: 报告页加 canvas 与按钮**

`report.wxml` 末尾加：
```xml
<canvas canvas-id="reportCanvas" class="report-canvas"></canvas>
<button wx:if="{{full}}" class="secondary" bindtap="onSaveImage">保存报告长图</button>
```
`report.wxss` 加：
```css
.report-canvas { position: fixed; left: -9999px; top: 0; width: 750px; height: 2400px; }
```
`report.js` 加：
```js
  onSaveImage: function () {
    var reportImage = require("../../utils/report-image");
    reportImage.drawReportImage(this.data.report, "reportCanvas", this);
  },
```

- [ ] **Step 3: 真机测试并提交**

Run: 保存长图 → 相册可见；若失败，提示复制文字。

```bash
git add miniprogram/utils/report-image.js miniprogram/pages/report
git commit -m "feat(checkup): add report long-image export"
```

**Acceptance:** 长图可保存；失败有兜底；图上带免责声明。

---

### Task 20: 预约页与关于页

**Files:**
- Create: `miniprogram/pages/booking/booking.{js,wxml,wxss,json}`
- Create: `miniprogram/pages/about/about.{js,wxml,wxss,json}`

- [ ] **Step 1: 写 `booking.js`**

```js
var api = require("../../utils/api");
Page({
  data: { name: "", phone: "", timeWindow: "", question: "", submitting: false, done: false },
  onInput: function (e) {
    var key = e.currentTarget.dataset.key;
    var data = {}; data[key] = e.detail.value; this.setData(data);
  },
  onSubmit: function () {
    var self = this;
    if (self.data.submitting) return;
    if (!self.data.name || !/^1\d{10}$/.test(self.data.phone) || !self.data.timeWindow) {
      wx.showToast({ title: "请填写称呼、手机号和方便时间", icon: "none" });
      return;
    }
    self.setData({ submitting: true });
    api.checkup.appointment({
      sessionToken: wx.getStorageSync("checkup_session"),
      name: self.data.name, phone: self.data.phone,
      timeWindow: self.data.timeWindow, question: self.data.question,
    }).then(function () {
      self.setData({ done: true });
    }).catch(function () {
      wx.showToast({ title: "提交失败，请重试", icon: "none" });
    }).then(function () {
      self.setData({ submitting: false });
    });
  },
  onService: function () {
    // 使用小程序原生客服按钮时，此方法可留空；也可 wx.openCustomerServiceChat
  },
});
```

- [ ] **Step 2: 写 `booking.wxml`**

```xml
<view class="page">
  <block wx:if="{{!done}}">
    <text class="title">预约一次一对一诊断</text>
    <text class="hint">留下称呼、手机号和方便时间，我会在 24 小时内联系你。</text>
    <input class="field" placeholder="怎么称呼你" data-key="name" bindinput="onInput" />
    <input class="field" type="number" placeholder="手机号" data-key="phone" bindinput="onInput" />
    <input class="field" placeholder="方便时间，例如：工作日晚 8 点后" data-key="timeWindow" bindinput="onInput" />
    <textarea class="field" placeholder="最想解决的一个问题（选填）" data-key="question" bindinput="onInput" />
    <button class="primary" bindtap="onSubmit" loading="{{submitting}}">提交预约</button>
  </block>
  <block wx:else>
    <text class="title">已收到</text>
    <text class="hint">我会在 24 小时内联系你。也可以先通过小程序客服问我。</text>
    <button class="secondary" open-type="contact">联系客服</button>
  </block>
</view>
```

- [ ] **Step 3: 写 `booking.wxss`**

```css
.page { padding: 40rpx 32rpx; background: #f7f8fa; min-height: 100vh; }
.title { display: block; font-size: 42rpx; font-weight: 700; }
.hint { display: block; margin: 16rpx 0 28rpx; font-size: 26rpx; color: #6b7280; line-height: 1.7; }
.field { display: block; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; font-size: 28rpx; }
.primary { margin-top: 32rpx; background: #1a56db; color: #fff; border-radius: 999rpx; }
.secondary { margin-top: 32rpx; background: #fff; color: #1a56db; border: 1rpx solid #1a56db; border-radius: 999rpx; }
```

- [ ] **Step 4: 写 `about` 页（个人介绍、隐私、免责）**

`about.wxml`：
```xml
<view class="page">
  <text class="title">关于这个工具</text>
  <text class="body">我是樊家浩，过去 4 年做京东运营，现在专注结合 AI 做家庭风险和传承，定位是「财富安全风险架构师」。</text>
  <text class="body">这个工具是我做的。我理解很多客户不愿意一上来就把家里情况告诉代理人，所以在这个 AI 时代，我把它做成一个可以匿名使用的测评。</text>
  <text class="body">你的回答不会被保存，只会存在你自己的手机上。做完报告后，如果有任何咨询，欢迎来跟我沟通。</text>
  <text class="section">隐私说明</text>
  <text class="body">对话内容不写入服务器数据库；只有你主动预约时，才会保存称呼、手机号和方便时间，用于联系你。</text>
  <text class="section">免责声明</text>
  <text class="body">本工具由 AI 辅助生成风险自查参考，不构成保险产品推荐、投保建议或法律意见。最终方案请以保险公司正式条款和专业人士意见为准。</text>
</view>
```

`about.js`：
```js
Page({});
```
`about.wxss` 与 `index.wxss` 类似；`about.json` 设置标题。

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/booking miniprogram/pages/about
git commit -m "feat(checkup): add booking and about pages"
```

**Acceptance:** 预约提交后台可见；关于页含隐私与免责声明。

---

### Task 21: 语音输入（V1.1，可选但低门槛）

**Files:**
- Modify: `miniprogram/pages/chat/chat.js`
- Modify: `miniprogram/pages/chat/chat.wxml`

- [ ] **Step 1: 在 `chat.js` 加录音逻辑**

```js
  initVoice: function () {
    var self = this;
    var plugin = requirePlugin("WechatSI");
    self.voiceManager = plugin.getRecordRecognitionManager();
    self.voiceManager.onRecognize = function (res) { self.setData({ inputValue: res.result }); };
    self.voiceManager.onStop = function (res) { self.setData({ inputValue: res.result || self.data.inputValue }); };
    self.voiceManager.onError = function () { wx.showToast({ title: "语音识别失败，请用键盘", icon: "none" }); };
  },
  onVoiceStart: function () { if (this.voiceManager) this.voiceManager.start({ duration: 60000, lang: "zh_CN" }); },
  onVoiceEnd: function () { if (this.voiceManager) this.voiceManager.stop(); },
```
在 `onLoad` 末尾调用 `this.initVoice();`。

- [ ] **Step 2: 在 `chat.wxml` 底部加按钮**

```xml
<button class="voice" bindtouchstart="onVoiceStart" bindtouchend="onVoiceEnd">按住说话</button>
```

- [ ] **Step 3: 手动测试并提交**

WeChat DevTools 真机：按住说话 → 文字进入输入框 → 可编辑 → 发送；录音不上传。

```bash
git add miniprogram/pages/chat
git commit -m "feat(checkup): add voice input for answers"
```

**Acceptance:** 语音转文字可用；识别失败回退键盘；录音不存。

---

### Task 22: 后台预约页

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/components/AdminCheckupPanel.tsx`

- [ ] **Step 1: 写 `AdminCheckupPanel.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

interface Appointment {
  id: number; name: string; phone: string; timeWindow: string; question: string; status: string; createdAt: string;
}

export default function AdminCheckupPanel({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/checkup/appointments", { headers: { "x-admin-key": adminKey } })
      .then(async (res) => {
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setItems(data.appointments || []);
      })
      .catch((e) => setError(e.message));
  }, [adminKey]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-gray-500">暂无预约</p>}
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-3 text-sm">
          <p className="font-medium">{item.name} · {item.phone}</p>
          <p className="text-gray-500">{item.timeWindow} · {item.status}</p>
          {item.question && <p className="text-gray-600 mt-1">{item.question}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 在 `admin/page.tsx` 加标签页**

在页面顶部已有状态里加 `tab`：
```tsx
const [tab, setTab] = useState<"orders" | "checkup">("orders");
```
在按钮区加：
```tsx
<button onClick={() => setTab("checkup")} className={tab === "checkup" ? "..." : "..."}>测评预约</button>
```
在内容区加：
```tsx
{tab === "checkup" && <AdminCheckupPanel adminKey={adminKey} />}
```
（`adminKey` 用页面现有的输入值；不要硬编码。）

- [ ] **Step 3: 跑 lint 并提交**

Run: `npm run lint`
```bash
git add src/app/admin/page.tsx src/components/AdminCheckupPanel.tsx
git commit -m "feat(checkup): add admin appointment panel"
```

**Acceptance:** 后台可看预约列表；手机号解密展示；无 `ADMIN_KEY` 时 401。

---

### Task 23: 安全回归与评测夹具

**Files:**
- Modify: `scripts/check-security-regressions.mjs`
- Create: `eval/checkup-cases.json`
- Create: `eval/checkup-pipeline.test.ts`

- [ ] **Step 1: 加安全回归项**

在 `scripts/check-security-regressions.mjs` 末尾加：
```js
const checkupStore = read("src/lib/checkup/store.ts");
assert(
  !/messages|answers|report_content/i.test(checkupStore),
  "checkup store must not persist conversation content or report body",
);
const checkupAnswer = read("src/app/api/checkup/answer/route.ts");
assert(
  !/INSERT INTO .*answers|console\.log\(.*answers/i.test(checkupAnswer),
  "checkup answer route must not persist or log answers",
);
const checkupAppointment = read("src/app/api/checkup/appointment/route.ts");
assert(
  checkupAppointment.includes("encrypt(name)") && checkupAppointment.includes("encrypt(phone)"),
  "appointment PII must be encrypted before storage",
);
const checkupNotify = read("src/app/api/checkup/pay/notify/route.ts");
assert(
  checkupNotify.includes("verifyNotifySign") && checkupNotify.includes("markCheckupOrderPaid"),
  "checkup payment notify must verify signature and mark paid server-side",
);
assert(
  !read("src/app/api/checkup/unlock/route.ts").includes("status === \"paid\""),
  "unlock must use canUnlock helper, not trust client status",
);
```

- [ ] **Step 2: 写夹具**

`eval/checkup-cases.json` 至少 6 个案例：
```json
[
  {"id": "case-1", "title": "50 岁企业主，孩子已婚", "firstMessage": "我自己开公司，孩子刚结婚，想给孩子留点钱", "expectedPrimary": "business"},
  {"id": "case-2", "title": "只有社保的家庭主妇", "firstMessage": "我只有社保，老公是主要收入，担心生病", "expectedPrimary": "protection"},
  {"id": "case-3", "title": "退休教师，关心养老", "firstMessage": "我快退休了，想知道养老金够不够", "expectedPrimary": "retirement"},
  {"id": "case-4", "title": "再婚家庭", "firstMessage": "我再婚了，想把钱留给前婚的孩子", "expectedPrimary": "marriage"},
  {"id": "case-5", "title": "孩子留学", "firstMessage": "孩子准备出国留学，教育金还没准备", "expectedPrimary": "education"},
  {"id": "case-6", "title": "担心传承纠纷", "firstMessage": "家里两个孩子，怕以后分家产闹矛盾", "expectedPrimary": "inheritance"}
]
```

- [ ] **Step 3: 写 pipeline 测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { triageFromText } from "../src/lib/checkup/triage";

const cases = JSON.parse(readFileSync("eval/checkup-cases.json", "utf8")) as Array<{ id: string; firstMessage: string; expectedPrimary: string }>;

test("fixture triage hits expected primary domain", () => {
  for (const item of cases) {
    assert.equal(triageFromText(item.firstMessage).primaryDomain, item.expectedPrimary, item.id);
  }
});

test("pipeline builds a safe report for a family case", () => {
  const report = buildReport({
    answers: [
      { questionId: "family_children", dimension: "family", field: "children", value: "married", skipped: false },
      { questionId: "protection_critical", dimension: "protection", field: "criticalIllness", value: "none", skipped: false },
      { questionId: "inheritance_tools", dimension: "inheritance", field: "inheritanceTools", value: "none", skipped: false },
    ],
    triage: { primaryDomain: "inheritance", secondaryDomain: null, confidence: 0.8, signals: [] },
    input: { annualIncome: 800000, annualExpense: 400000 },
  });
  assert.equal(report.wealthIndices.length, 5);
  assert.ok(report.topRisks.length <= 5);
  for (const risk of report.topRisks) assert.ok(risk.ifIgnored.length > 0);
  assert.ok(report.disclaimer.includes("不构成保险产品推荐"));
});
```
> 文件顶部补 `import { buildReport } from "../src/lib/checkup/report";`。

- [ ] **Step 4: 跑检查并提交**

Run:
```bash
npm run check:security
npm run test:eval
```
Expected: PASS。

```bash
git add scripts/check-security-regressions.mjs eval/checkup-cases.json eval/checkup-pipeline.test.ts
git commit -m "test(checkup): add security regressions and triage fixtures"
```

**Acceptance:** 安全回归覆盖零存储、PII 加密、支付验签、解锁服务端校验；6 个案例分诊正确。

---

### Task 24: 端到端验收、构建、发布

**Files:** 无

- [ ] **Step 1: 本地全链路（mock 支付）**

```bash
npm run dev
```
另开终端：
```bash
curl -s -X POST http://localhost:3000/api/checkup/session
# 用返回的 token 走 answer/preview/order/mock/status/unlock/appointment
```
Expected: 全链路返回正常；`checkup_events` 有匿名事件；`checkup_appointments` 的 name/phone 是密文。

- [ ] **Step 2: 静态检查**

```bash
npm run lint
npm run check:security
npm run test:eval
npm run build
```
Expected: 全部成功。

- [ ] **Step 3: 日志/隐私抽查**

Run:
```bash
grep -rn "console.log" src/app/api/checkup src/lib/checkup | head -20
```
Expected: 没有打印 prompt/answers/报告正文；只有 orderNo/sessionId 前 8 位/token 数。

- [ ] **Step 4: 真机验收**

WeChat DevTools：
1. 首页 → 开始测评
2. 家庭结构问题 → 选项/跳过/打字
3. 6–12 轮后出免费报告
4. 1 元支付（真实支付需商户号）
5. 完整报告 → 复制文字
6. 预约 → 后台可见

- [ ] **Step 5: 部署（用户确认后）**

```bash
vercel --prod
```
Expected: 生产域名可访问；`/api/checkup/session` 返回 200；`/api/checkup/pay/mock` 返回 404。

- [ ] **Step 6: 小程序上传（手动）**

- 微信开发者工具导入 `miniprogram/`
- 确认 `apiBase` 为 `https://baojiaolian.com.cn`
- 上传新版本 → 提交审核

**Acceptance:** 本地全链路通过；生产接口正常；小程序提审完成。

---

## 4. 自查

### 4.1 规格覆盖

| 规格章节 | 对应任务 |
|---|---|
| 客户旅程 | Task 13/17/18/19/20 |
| 5 大指数 | Task 4/10 |
| AI 报告增强与降级 | Task 10.5/14 |
| 先听后问、6–12 轮 | Task 7/18 |
| 免费版/完整版 | Task 10/19 |
| 1 元支付 | Task 14 |
| 预约 + 客服 | Task 15/20 |
| 零存储 | Task 12/13/14/15/23 |
| 合规守卫 | Task 11/14/23 |
| 知识包 | Task 8.5 |
| 保存长图 | Task 19.5 |
| 语音输入 V1.1 | Task 21 |
| 后台 | Task 15/22 |
| 验收/发布 | Task 24 |

### 4.2 占位符扫描

已检查：没有 `TBD` / `TODO` / “实现细节略” / “类似 Task N”。

### 4.3 类型一致性

- `Answer`、`Question`、`WealthIndexScore`、`CheckupReport` 在 Task 2 定义，后续任务直接引用。
- `buildOrderNo` / `isOrderExpired` / `canUnlock` 在 Task 12 定义，Task 14 使用。
- `buildReport` / `toFreeReport` / `reportToText` 在 Task 10 定义，Task 13/19 使用。
- `createSessionToken` / `verifySessionToken` 在 Task 5 定义，Task 13/14/15 使用。

---

## 5. 执行方式

计划完成后再决定：Subagent-Driven（每个 Task 一个子代理，Lead 审核）或 Inline Execution（本会话按 Task 执行，阶段验收后暂停）。

- Baseline (2026-10-28): lint/security/test:eval/build all green on `feat/family-risk-checkup`.
