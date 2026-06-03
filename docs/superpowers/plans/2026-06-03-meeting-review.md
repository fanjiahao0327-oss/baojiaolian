# Meeting Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mini-program-first “面谈复盘” mode with optional agent voice recap-to-text, fixed five-section coach output, conversation saving, and no automatic KYC writes.

**Architecture:** Add a fourth coach mode, `meeting_review`, alongside `diagnosis`, `objection_followup`, and `pre_meeting_prep`. The backend owns request normalization, validation, prompt construction, title generation, injection checks, and the output contract; the mini program owns the form, voice recap input, and the stable non-streaming coach request.

**Tech Stack:** Next.js API route handlers, TypeScript shared types, existing `knowledge.ts` module selector, WeChat Mini Program JS/WXML/WXSS, WechatSI record recognition plugin, existing `npm run check:security`, `npm run lint`, and `npm run build`.

---

### Task 1: Backend Meeting Review Helpers

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/meeting-review.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Write the failing regression checks**

Add static checks to `scripts/check-security-regressions.mjs` requiring the new backend helper and mode strings:

```js
assert(
  coachRoute.includes("meeting_review"),
  "coach route should support explicit meeting review mode",
);
assert(
  coachRoute.includes("buildMeetingReviewModeInstructions"),
  "coach route should apply meeting review mode instructions",
);
assert(
  coachRoute.includes("normalizeMeetingReviewData"),
  "coach route should normalize meeting review payloads",
);
assert(
  coachRoute.includes("meetingReviewFields"),
  "coach route should scan meeting review payloads for prompt injection",
);
```

Run: `npm run check:security`

Expected: FAIL with missing `meeting_review` / helper checks.

- [ ] **Step 2: Add shared meeting review types**

Update `src/types/index.ts`:

```ts
export type CoachMode = "diagnosis" | "objection_followup" | "pre_meeting_prep" | "meeting_review";

export type MeetingReviewResult =
  | "interested"
  | "hesitant"
  | "rejected"
  | "booked_next"
  | "family_discussion"
  | "info_missing";

export type MeetingReviewNextGoal =
  | "wechat"
  | "call"
  | "next_meeting"
  | "send_material"
  | "pause";

export interface MeetingReviewData {
  recap: string;
  meetingResult?: MeetingReviewResult;
  customerQuotes?: string;
  agentResponse?: string;
  nextGoal?: MeetingReviewNextGoal;
}
```

- [ ] **Step 3: Add helper module**

Create `src/lib/meeting-review.ts`:

```ts
import type {
  KYCFormData,
  MeetingReviewData,
  MeetingReviewNextGoal,
  MeetingReviewResult,
} from "@/types";

export const MEETING_REVIEW_RESULT_LABELS: Record<MeetingReviewResult, string> = {
  interested: "有兴趣",
  hesitant: "犹豫",
  rejected: "明确拒绝",
  booked_next: "约了下次",
  family_discussion: "需要家人商量",
  info_missing: "信息不足",
};

export const MEETING_REVIEW_NEXT_GOAL_LABELS: Record<MeetingReviewNextGoal, string> = {
  wechat: "发微信",
  call: "打电话",
  next_meeting: "约下次见面",
  send_material: "补充资料",
  pause: "暂缓观察",
};

export function normalizeMeetingReviewData(input: unknown): MeetingReviewData {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<MeetingReviewData>;
  const meetingResult: MeetingReviewResult =
    raw.meetingResult && raw.meetingResult in MEETING_REVIEW_RESULT_LABELS
      ? raw.meetingResult
      : "info_missing";
  const nextGoal: MeetingReviewNextGoal =
    raw.nextGoal && raw.nextGoal in MEETING_REVIEW_NEXT_GOAL_LABELS
      ? raw.nextGoal
      : "wechat";

  return {
    recap: String(raw.recap || "").trim(),
    meetingResult,
    customerQuotes: String(raw.customerQuotes || "").trim(),
    agentResponse: String(raw.agentResponse || "").trim(),
    nextGoal,
  };
}

export function validateMeetingReviewData(data: MeetingReviewData): string | null {
  if (!data.recap) return "请填写面谈过程复盘";
  if (data.recap.length > 1600) return "面谈过程复盘请控制在 1600 字以内";
  if ((data.customerQuotes || "").length > 800) return "客户关键原话请控制在 800 字以内";
  if ((data.agentResponse || "").length > 800) return "我的回应请控制在 800 字以内";
  return null;
}

export function buildMeetingReviewQuestion(data: MeetingReviewData): string {
  return `# 面谈复盘

## 面谈过程复盘
${data.recap}

## 面谈结果
${MEETING_REVIEW_RESULT_LABELS[data.meetingResult || "info_missing"]}

## 客户关键原话
${data.customerQuotes || "未填写"}

## 我的回应
${data.agentResponse || "未填写"}

## 下一步目标
${MEETING_REVIEW_NEXT_GOAL_LABELS[data.nextGoal || "wechat"]}

请严格按以下五段输出：
1. 本次面谈结论
2. 下一步跟进计划
3. 下一次怎么说
4. 本次哪里走偏了
5. 建议补充到客户档案`;
}

export function buildMeetingReviewConversationTitle(
  data: MeetingReviewData,
  kycData: Partial<KYCFormData> | Record<string, unknown> | null | undefined,
): string {
  const name = typeof kycData?.clientName === "string" ? kycData.clientName.trim() : "";
  const result = MEETING_REVIEW_RESULT_LABELS[data.meetingResult || "info_missing"];
  return name ? `面谈复盘：${name}/${result}` : `面谈复盘：${result}`;
}

export function buildMeetingReviewModeInstructions(): string {
  return `# 面谈复盘模式

你正在处理的是代理人面谈结束后的会后复盘，不是见面前准备，也不是线下面谈现场实时逐句接话。

输出必须先给行动计划，再给教练纠偏，并严格使用以下五段标题：

## 1. 本次面谈结论
判断客户当前大概率处于哪个顾问式面谈阶段，以及客户真实意向。不要编造客户没有提供的信息；不确定内容必须写成“可能”。

## 2. 下一步跟进计划
给出什么时候跟、用什么方式跟、这次跟进目标是什么、先补哪类信息。计划要简短、具体、能行动，不催促客户马上决定。

## 3. 下一次怎么说
根据下一步目标输出可直接用于微信、电话或下次见面的自然话术。不反驳客户、不承诺收益、不替客户做决定。

## 4. 本次哪里走偏了
指出代理人是否太早讲产品/收益/价格，是否没有问透需求，是否跳过关系和信任，是否没有处理家庭决策人，是否催急或解释过多。表达要直接但不打击人。

## 5. 建议补充到客户档案
只列建议补充项，不自动写入。每项按“字段、依据、类型”表达，类型只能是“事实”或“待确认”。不要输出 [KYC_UPDATE] 标签。

不要输出产品推荐、投保建议、收益承诺或具体保险方案。`;
}
```

- [ ] **Step 4: Verify the new helper compiles**

Run: `npm run lint`

Expected: FAIL until `src/app/api/coach/route.ts` imports are still absent from static checks, but TypeScript should not report syntax errors for the new helper/type definitions.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/meeting-review.ts scripts/check-security-regressions.mjs
git commit -m "feat: add meeting review helpers"
```

### Task 2: Coach API Mode Support

**Files:**
- Modify: `src/app/api/coach/route.ts`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Import meeting review helpers**

Add this import near the other mode helper imports:

```ts
import {
  buildMeetingReviewConversationTitle,
  buildMeetingReviewModeInstructions,
  buildMeetingReviewQuestion,
  normalizeMeetingReviewData,
  validateMeetingReviewData,
} from "@/lib/meeting-review";
```

- [ ] **Step 2: Parse `meetingReview` from the request body**

Extend the request body destructuring:

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
  preMeetingPrep,
  meetingReview,
} = body;
```

- [ ] **Step 3: Route the new mode**

Update `mode` normalization:

```ts
const mode: CoachMode =
  rawMode === "objection_followup"
    ? "objection_followup"
    : rawMode === "pre_meeting_prep"
      ? "pre_meeting_prep"
      : rawMode === "meeting_review"
        ? "meeting_review"
        : "diagnosis";
```

- [ ] **Step 4: Normalize and validate meeting review payloads**

Add after the pre-meeting block:

```ts
const rawMeetingReview = meetingReview as Record<string, unknown> | null | undefined;
const hasMeetingReviewPayload =
  mode === "meeting_review" &&
  !!rawMeetingReview &&
  typeof rawMeetingReview === "object" &&
  String(rawMeetingReview.recap || "").trim().length > 0;
const meetingReviewData = hasMeetingReviewPayload
  ? normalizeMeetingReviewData(meetingReview)
  : null;
const meetingReviewError = meetingReviewData ? validateMeetingReviewData(meetingReviewData) : null;
if (meetingReviewError) {
  return NextResponse.json({ error: meetingReviewError }, { status: 400 });
}
if (mode === "meeting_review" && !hasMeetingReviewPayload && !(rawConversationId && Number(rawConversationId) > 0)) {
  return NextResponse.json({ error: "请填写面谈过程复盘" }, { status: 400 });
}
```

- [ ] **Step 5: Use the meeting review first message**

Extend `userInput`:

```ts
const userInput = mode === "objection_followup" && objectionData
  ? buildObjectionFollowupQuestion(objectionData)
  : mode === "pre_meeting_prep" && preMeetingPrepData
    ? buildPreMeetingPrepQuestion(preMeetingPrepData)
    : mode === "meeting_review" && meetingReviewData
      ? buildMeetingReviewQuestion(meetingReviewData)
      : String(question || "");
```

- [ ] **Step 6: Scan meeting review text for injection**

Add:

```ts
const meetingReviewFields = meetingReviewData
  ? [
      meetingReviewData.recap,
      meetingReviewData.customerQuotes || "",
      meetingReviewData.agentResponse || "",
    ]
  : [];
```

Then include it in the guard:

```ts
meetingReviewFields.some((field) => detectInjection(field))
```

- [ ] **Step 7: Generate meeting review titles**

Extend `conversationTitle`:

```ts
const conversationTitle = mode === "objection_followup" && objectionData
  ? buildObjectionConversationTitle(objectionData)
  : mode === "pre_meeting_prep" && preMeetingPrepData
    ? buildPreMeetingPrepConversationTitle(preMeetingPrepData, safeKycData)
    : mode === "meeting_review" && meetingReviewData
      ? buildMeetingReviewConversationTitle(meetingReviewData, safeKycData)
      : generateClientName(safeKycData);
```

- [ ] **Step 8: Apply meeting review instructions**

Extend `modeInstructions`:

```ts
const modeInstructions =
  mode === "objection_followup"
    ? buildObjectionModeInstructions()
    : mode === "pre_meeting_prep"
      ? buildPreMeetingPrepModeInstructions()
      : mode === "meeting_review"
        ? buildMeetingReviewModeInstructions()
        : "";
```

- [ ] **Step 9: Disable KYC auto update for meeting review**

Update the non-diagnosis KYC message label:

```ts
: `5. **KYC 自动更新：** 当前是${mode === "pre_meeting_prep" ? "见前准备" : mode === "meeting_review" ? "面谈复盘" : "客户卡点跟进"}模式，不要输出 [KYC_UPDATE] 标签；如果发现客户档案有值得补充的信息，只在回答中提醒代理人后续手动补充。`;
```

- [ ] **Step 10: Omit `meetingReview` from `restBody`**

Extend the body cleanup destructuring:

```ts
meetingReview: _meetingReview,
```

- [ ] **Step 11: Verify backend static checks**

Run: `npm run check:security`

Expected: backend meeting review checks pass. Mini program meeting review checks still fail until Task 3/4.

- [ ] **Step 12: Commit**

```bash
git add src/app/api/coach/route.ts scripts/check-security-regressions.mjs
git commit -m "feat: support meeting review coach mode"
```

### Task 3: Mini Program State And Submission

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Add failing mini regression checks**

Add checks to `scripts/check-security-regressions.mjs`:

```js
assert(
  miniCoach.includes("submitMeetingReview"),
  "mini program should expose meeting review submission",
);
assert(
  miniCoach.includes("mode: \"meeting_review\"") &&
    miniCoach.includes("meetingReview:"),
  "mini program should send explicit meeting review mode and payload",
);
assert(
  miniCoach.includes("meetingReviewForm") &&
    miniCoachWxml.includes("面谈复盘") &&
    miniCoachWxml.includes("语音复盘"),
  "mini program should render the meeting review form and voice recap entry",
);
assert(
  miniCoach.includes("voiceTarget") &&
    miniCoach.includes("_applyVoiceText"),
  "mini program voice recognition should route recognized text to the active input target",
);
```

Run: `npm run check:security`

Expected: FAIL before mini program files are changed.

- [ ] **Step 2: Add options and empty form**

Add near the prep options in `miniprogram/pages/coach/coach.js`:

```js
var MEETING_REVIEW_RESULT_OPTIONS = [
  { value: "interested", label: "有兴趣" },
  { value: "hesitant", label: "犹豫" },
  { value: "rejected", label: "明确拒绝" },
  { value: "booked_next", label: "约了下次" },
  { value: "family_discussion", label: "需要家人商量" },
  { value: "info_missing", label: "信息不足" },
];

var MEETING_REVIEW_GOAL_OPTIONS = [
  { value: "wechat", label: "发微信" },
  { value: "call", label: "打电话" },
  { value: "next_meeting", label: "约下次见面" },
  { value: "send_material", label: "补充资料" },
  { value: "pause", label: "暂缓观察" },
];

var EMPTY_MEETING_REVIEW_FORM = {
  recap: "",
  meetingResult: "info_missing",
  customerQuotes: "",
  agentResponse: "",
  nextGoal: "wechat",
};
```

- [ ] **Step 3: Add page data**

Add to `data`:

```js
meetingReviewForm: JSON.parse(JSON.stringify(EMPTY_MEETING_REVIEW_FORM)),
meetingReviewResultOptions: MEETING_REVIEW_RESULT_OPTIONS,
meetingReviewResultLabels: MEETING_REVIEW_RESULT_OPTIONS.map(function (item) { return item.label; }),
meetingReviewResultIndex: 5,
meetingReviewResultLabel: MEETING_REVIEW_RESULT_OPTIONS[5].label,
meetingReviewGoalOptions: MEETING_REVIEW_GOAL_OPTIONS,
voiceTarget: "",
```

- [ ] **Step 4: Include meeting review in light customer selection path**

Update `selectClient`:

```js
if (
  self.data.workMode === "objection_followup" ||
  self.data.workMode === "pre_meeting_prep" ||
  self.data.workMode === "meeting_review"
) {
  self.setData({
    selectedClientId: id ? Number(id) : null,
    showClientPicker: false,
  });
  return;
}
```

- [ ] **Step 5: Add form handlers**

Add handlers after the pre-meeting handlers:

```js
onMeetingReviewFieldChange(e) {
  var key = e.currentTarget.dataset.key;
  var data = {};
  data["meetingReviewForm." + key] = e.detail.value || "";
  this.setData(data);
},

onMeetingReviewResultChange(e) {
  var idx = Number(e.detail.value || 0);
  var option = MEETING_REVIEW_RESULT_OPTIONS[idx] || MEETING_REVIEW_RESULT_OPTIONS[5];
  this.setData({
    meetingReviewResultIndex: idx,
    meetingReviewResultLabel: option.label,
    "meetingReviewForm.meetingResult": option.value,
  });
},

onMeetingReviewGoalChange(e) {
  var value = e.currentTarget.dataset.value;
  if (!value) return;
  this.setData({ "meetingReviewForm.nextGoal": value });
},
```

- [ ] **Step 6: Add submit functions**

Add:

```js
submitMeetingReview() {
  var self = this;
  var raw = self.data.meetingReviewForm;
  var payload = {
    recap: (raw.recap || "").trim(),
    meetingResult: raw.meetingResult || "info_missing",
    customerQuotes: (raw.customerQuotes || "").trim(),
    agentResponse: (raw.agentResponse || "").trim(),
    nextGoal: raw.nextGoal || "wechat",
  };
  if (!payload.recap) {
    wx.showToast({ title: "请填写面谈过程复盘", icon: "none" });
    return;
  }
  self.ensureLogin().then(function () {
    self._doSubmitMeetingReview(payload);
  }).catch(function () {
    wx.showToast({ title: "登录失败，请重试", icon: "none" });
  });
},

_doSubmitMeetingReview(payload) {
  var self = this;
  var resultLabel = self.data.meetingReviewResultLabel || "面谈复盘";
  var userContent = "面谈复盘：" + resultLabel + "｜" + payload.recap;
  var userMsg = { role: "user", content: userContent, timestamp: Date.now() };
  var placeholderMsg = { role: "coach", content: "", timestamp: Date.now() + 1, streaming: true };

  self.setData({
    isLoading: true,
    hasSubmitted: true,
    tab: "coach",
    messages: [userMsg, placeholderMsg],
    conversationId: null,
    conversationMode: "meeting_review",
    lastPointCost: null,
  });
  self._startLoadingText();

  self.streamCoachRequest({
    kycData: {},
    question: userContent,
    history: [],
    clientId: self.data.selectedClientId,
    conversationId: null,
    mode: "meeting_review",
    meetingReview: payload,
  }).catch(function () {
    self._stopLoadingText();
    var msgs = self.data.messages;
    if (msgs.length > 0) {
      var last = msgs[msgs.length - 1];
      if (last.role === "coach" && last.streaming) {
        msgs[msgs.length - 1] = { role: "coach", content: "提交失败，请稍后重试。", timestamp: Date.now() };
      }
    }
    self.setData({ messages: msgs, isLoading: false });
  });
},
```

- [ ] **Step 7: Send `meetingReview` to the API**

Extend `streamCoachRequest` parameter destructuring:

```js
var { kycData, question, history, clientId, conversationId, mode, objectionFollowup, preMeetingPrep, meetingReview } = params;
```

Extend the request body:

```js
meetingReview: meetingReview || null,
```

- [ ] **Step 8: Infer historical meeting review conversations**

Update both `loadClientAndHistory` and `_inferConversationMode` checks:

```js
if (firstMessage.indexOf("# 客户卡点跟进") >= 0 || firstMessage.indexOf("客户卡点跟进") === 0) {
  inferredMode = "objection_followup";
} else if (firstMessage.indexOf("# 见前准备") >= 0 || firstMessage.indexOf("见前准备") === 0) {
  inferredMode = "pre_meeting_prep";
} else if (firstMessage.indexOf("# 面谈复盘") >= 0 || firstMessage.indexOf("面谈复盘") === 0) {
  inferredMode = "meeting_review";
}
```

Run: `node --check miniprogram/pages/coach/coach.js`

Expected: PASS after JS changes.

- [ ] **Step 9: Commit**

```bash
git add miniprogram/pages/coach/coach.js scripts/check-security-regressions.mjs
git commit -m "feat: add mini meeting review state"
```

### Task 4: Mini Program Form And Voice Recap UI

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`
- Test: `scripts/check-security-regressions.mjs`

- [ ] **Step 1: Route recognized voice text to a target**

Change the voice stop handler from direct KYC parsing to target routing:

```js
self._voiceManager.onStop = function (res) {
  self.setData({ recording: false });
  if (res.result) {
    self.setData({ voiceText: res.result });
    self._applyVoiceText(res.result);
  }
};
```

Add:

```js
startMeetingReviewVoiceInput() {
  this.setData({ voiceTarget: "meetingReviewRecap" });
  this.startVoiceInput();
},

_applyVoiceText(text) {
  var clean = String(text || "").trim();
  if (!clean) return;
  if (this.data.voiceTarget === "meetingReviewRecap") {
    var current = (this.data.meetingReviewForm.recap || "").trim();
    this.setData({
      "meetingReviewForm.recap": current ? current + "\n" + clean : clean,
      voiceTarget: "",
    });
    wx.showToast({ title: "已填入面谈复盘", icon: "success" });
    return;
  }
  this._parseVoiceText(clean);
},
```

Keep `_parseVoiceText` for possible future KYC use, but do not call `/api/coach/parse-kyc` from the meeting review path.

- [ ] **Step 2: Show fourth mode and tab label**

Update the top tab label expression so meeting review displays `面谈复盘`:

```xml
{{workMode === 'objection_followup' ? '卡点跟进' : (workMode === 'pre_meeting_prep' ? '见前准备' : (workMode === 'meeting_review' ? '面谈复盘' : '信息填写'))}}
```

Add a mode item:

```xml
<view class="work-mode-item {{workMode === 'meeting_review' ? 'active' : ''}}" data-mode="meeting_review" bindtap="switchWorkMode">面谈复盘</view>
```

- [ ] **Step 3: Render meeting review form**

Add a `wx:elif="{{workMode === 'meeting_review'}}"` block between pre-meeting and diagnosis:

```xml
<block wx:elif="{{workMode === 'meeting_review'}}">
  <view class="objection-card meeting-review-card">
    <view class="objection-title">面谈复盘</view>
    <view class="objection-desc">适合面谈结束后，把刚才聊了什么、客户反应和下一步目标整理成跟进计划。</view>

    <view class="voice-entry meeting-review-voice-entry" bindtap="startMeetingReviewVoiceInput">
      <text class="voice-icon">🎤</text>
      <text class="voice-label">语音复盘</text>
      <text class="voice-hint">口述面谈过程，自动转文字</text>
    </view>

    <view class="field">
      <view class="label">面谈过程复盘<text class="required">*</text></view>
      <textarea class="textarea" value="{{meetingReviewForm.recap}}" data-key="recap" bindinput="onMeetingReviewFieldChange" placeholder="例如：今天先聊了家庭和孩子教育，客户说担心未来医疗和孩子留学，但我后面太快讲到产品，客户说回去考虑一下" auto-height maxlength="1600" />
    </view>

    <view class="field">
      <view class="label">面谈结果</view>
      <picker mode="selector" range="{{meetingReviewResultLabels}}" value="{{meetingReviewResultIndex}}" bindchange="onMeetingReviewResultChange">
        <view class="picker-display">
          <text>{{meetingReviewResultLabel}}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="field">
      <view class="label">客户关键原话<text class="optional-inline">可选</text></view>
      <textarea class="textarea" value="{{meetingReviewForm.customerQuotes}}" data-key="customerQuotes" bindinput="onMeetingReviewFieldChange" placeholder="例如：我觉得这个有点贵 / 我想跟家里人商量一下 / 收益能不能高一点" auto-height maxlength="800" />
    </view>

    <view class="field">
      <view class="label">我的回应<text class="optional-inline">可选</text></view>
      <textarea class="textarea" value="{{meetingReviewForm.agentResponse}}" data-key="agentResponse" bindinput="onMeetingReviewFieldChange" placeholder="例如：我当时继续解释了保障责任，客户后面不太接话" auto-height maxlength="800" />
    </view>

    <view class="field">
      <view class="label">下一步目标</view>
      <view class="goal-grid meeting-review-goal-grid">
        <view
          class="goal-item {{meetingReviewForm.nextGoal === item.value ? 'active' : ''}}"
          wx:for="{{meetingReviewGoalOptions}}"
          wx:key="value"
          data-value="{{item.value}}"
          bindtap="onMeetingReviewGoalChange"
        >
          {{item.label}}
        </view>
      </view>
    </view>

    <button class="btn-primary objection-submit" bindtap="submitMeetingReview" disabled="{{isLoading}}" loading="{{isLoading}}">
      {{isLoading ? 'AI 正在复盘面谈...' : '生成复盘建议'}}
    </button>
  </view>
</block>
```

- [ ] **Step 4: Enable the voice overlay**

Replace the hidden overlay condition:

```xml
<view class="voice-overlay" wx:if="{{recording}}">
```

Replace the hidden parsing overlay condition:

```xml
<view class="voice-parsing-overlay" wx:if="{{voiceParsingKyc}}">
```

Close the old hidden voice comments or remove them so WXML does not keep voice UI commented out.

- [ ] **Step 5: Update styles**

Update `.work-mode-switch` to fit four modes:

```css
.work-mode-switch {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
```

Add compact voice spacing:

```css
.meeting-review-card .voice-entry {
  margin-bottom: 28rpx;
}

.meeting-review-goal-grid {
  grid-template-columns: repeat(2, 1fr);
}
```

- [ ] **Step 6: Verify mini program syntax and regression checks**

Run:

```bash
node --check miniprogram/pages/coach/coach.js
npm run check:security
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add miniprogram/pages/coach/coach.js miniprogram/pages/coach/coach.wxml miniprogram/pages/coach/coach.wxss scripts/check-security-regressions.mjs
git commit -m "feat: add mini meeting review form"
```

### Task 5: Full Verification And Release

**Files:**
- Verify changed backend and mini program files.
- Deploy backend because `src/app/api/coach/route.ts` changes.

- [ ] **Step 1: Run full local verification**

```bash
npm run check:security
node --check miniprogram/pages/coach/coach.js
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect git diff before release**

```bash
git status --short
git diff --check
git log --oneline -5
```

Expected: no unstaged files after commits, no whitespace errors, recent commits show meeting review work.

- [ ] **Step 3: Deploy production backend**

```bash
vercel --prod
```

Expected: deployment status Ready.

- [ ] **Step 4: Verify public backend**

```bash
curl -fsS https://baojiaolian.com.cn/api/payment/packages
curl -i https://baojiaolian.com.cn/api/auth/me
```

Expected: packages returns JSON; auth/me returns `401` or another authentication response without server error.

- [ ] **Step 5: Final handoff**

Tell the user:

- Backend has been deployed to `https://baojiaolian.com.cn`.
- Because files under `miniprogram/` changed, WeChat Developer Tools upload/review is still required.
- Open `/Users/fanjiahao/Documents/保险ai教练/baojiaolian/miniprogram` in WeChat Developer Tools, upload a new version, then submit review.
