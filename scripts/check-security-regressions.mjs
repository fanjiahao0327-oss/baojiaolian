import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${message}`);
  }
}

const instrumentation = read("src/instrumentation.ts");
const pkg = JSON.parse(read("package.json"));
assert(
  pkg.overrides &&
    pkg.overrides.next &&
    pkg.overrides.next.postcss &&
    !String(pkg.overrides.next.postcss).startsWith("8.4."),
  "Next.js nested PostCSS should be overridden to a patched version",
);
assert(
  instrumentation.includes("try") &&
    instrumentation.includes("catch") &&
    instrumentation.includes("[instrumentation] initDB failed"),
  "database init in instrumentation must not crash serverless responses on transient Neon failures",
);

const verifyRoute = read("src/app/api/payment/verify/route.ts");
assert(
  !verifyRoute.includes("startsWith(\"VP-\")") && !verifyRoute.includes("startsWith('VP-')"),
  "client-side payment verify must not directly credit virtual-pay VP orders",
);

const prepayRoute = read("src/app/api/payment/prepay/route.ts");
assert(
  !prepayRoute.includes("createJSAPIPrepay") && !prepayRoute.includes("payParams"),
  "mini program virtual products must not fall back to standard JSAPI payment params",
);
assert(
  prepayRoute.includes("unsealWechatSessionKey"),
  "virtual payment should decrypt stored WeChat session keys only on the server",
);

const wechatLoginRoute = read("src/app/api/auth/wechat-login/route.ts");
assert(
  wechatLoginRoute.includes("sealWechatSessionKey(sessionKey)") &&
    !wechatLoginRoute.includes("wechat_session_key = ${sessionKey}"),
  "wechat session keys should be sealed before database storage",
);

const loginRoute = read("src/app/api/auth/login/route.ts");
const loginPage = read("src/app/login/page.tsx");
const adminPage = read("src/app/admin/page.tsx");
const tokenModule = read("src/lib/token.ts");
const proxyModule = read("src/proxy.ts");
assert(
  loginRoute.includes("isFixedCodeLoginAllowed") &&
    loginRoute.includes("Web 短信登录暂未开通") &&
    !loginRoute.includes('if (code !== "1234")'),
  "production web login must not accept the fixed internal test code",
);
assert(
  !loginPage.includes("固定验证码：1234"),
  "web login page must not advertise a fixed verification code",
);
assert(
  adminPage.includes("容量监控") &&
    adminPage.includes("fetchCapacity") &&
    adminPage.includes("/api/admin/capacity") &&
    !adminPage.includes("DATABASE_URL"),
  "admin page should render protected capacity monitoring without exposing database secrets",
);
assert(
  tokenModule.includes("constantTimeEqual") &&
    !tokenModule.includes(") !== sig"),
  "mini program bearer token signatures should be compared in constant time",
);
assert(
  proxyModule.includes("scriptSources") &&
    !proxyModule.includes("script-src 'self' 'unsafe-inline' 'unsafe-eval'"),
  "production CSP should not allow unsafe-eval by default",
);
const securityModule = exists("src/lib/security.ts") ? read("src/lib/security.ts") : "";
const adminRoute = read("src/app/api/admin/orders/route.ts");
const adminConfirmRoute = read("src/app/api/admin/orders/[order_no]/confirm/route.ts");
const adminCancelRoute = read("src/app/api/admin/orders/[order_no]/cancel/route.ts");
const pointsChargeRoute = read("src/app/api/points/charge/route.ts");
const capacityRouteExists = exists("src/app/api/admin/capacity/route.ts");
const capacityRoute = capacityRouteExists ? read("src/app/api/admin/capacity/route.ts") : "";
const capacityModuleExists = exists("src/lib/capacity.ts");
const capacityModule = capacityModuleExists ? read("src/lib/capacity.ts") : "";
const capacityScriptExists = exists("scripts/check-db-capacity.mjs");
const capacityScript = capacityScriptExists ? read("scripts/check-db-capacity.mjs") : "";
assert(
  securityModule.includes("timingSafeEqual") &&
    adminRoute.includes("isAdminKeyValid(adminKey)") &&
    adminConfirmRoute.includes("isAdminKeyValid(adminKey)") &&
    adminCancelRoute.includes("isAdminKeyValid(adminKey)") &&
    pointsChargeRoute.includes("isAdminKeyValid(adminKey)"),
  "admin keys should be verified with timing-safe comparison in all admin paths",
);
assert(
  capacityRouteExists &&
    capacityRoute.includes("isAdminKeyValid(adminKey)") &&
    capacityRoute.includes("getDatabaseCapacityReport") &&
    capacityRoute.includes("无权限"),
  "admin capacity route should exist and be protected by the existing admin key",
);
assert(
  capacityModuleExists &&
    capacityModule.includes("DATABASE_CAPACITY_BYTES") &&
    capacityModule.includes("pg_database_size") &&
    capacityModule.includes("pg_total_relation_size") &&
    capacityModule.includes("information_schema.tables") &&
    !capacityModule.includes("DATABASE_URL"),
  "capacity module should query aggregate database metadata without exposing connection secrets",
);
assert(
  capacityScriptExists &&
    capacityScript.includes("getDatabaseCapacityReport") &&
    capacityScript.includes("容量监控") &&
    !capacityScript.includes("DATABASE_URL="),
  "local capacity script should print an aggregate capacity report without printing secrets",
);

const coachRoute = read("src/app/api/coach/route.ts");
const coachPrompt = read("src/lib/coach-prompt.ts");
const knowledgeFiles = [
  "src/lib/knowledge/index.ts",
  "src/lib/knowledge/types.ts",
  "src/lib/knowledge/core.ts",
  "src/lib/knowledge/methods.ts",
  "src/lib/knowledge/products-critical-illness.ts",
  "src/lib/knowledge/products-savings-dividend.ts",
  "src/lib/knowledge/objections.ts",
  "src/lib/knowledge/cases.ts",
  "src/lib/knowledge/selector.ts",
];
for (const rel of knowledgeFiles) {
  assert(exists(rel), `knowledge module file should exist: ${rel}`);
}
const knowledgeIndex = exists("src/lib/knowledge/index.ts") ? read("src/lib/knowledge/index.ts") : "";
const knowledgeTypes = exists("src/lib/knowledge/types.ts") ? read("src/lib/knowledge/types.ts") : "";
const knowledgeSelector = exists("src/lib/knowledge/selector.ts") ? read("src/lib/knowledge/selector.ts") : "";
const criticalIllnessKnowledge = exists("src/lib/knowledge/products-critical-illness.ts") ? read("src/lib/knowledge/products-critical-illness.ts") : "";
const savingsDividendKnowledge = exists("src/lib/knowledge/products-savings-dividend.ts") ? read("src/lib/knowledge/products-savings-dividend.ts") : "";
const legacyKnowledge = read("src/lib/knowledge.ts");
assert(
  knowledgeTypes.includes("sourceRefs") &&
    knowledgeTypes.includes("KnowledgeTopic") &&
    knowledgeTypes.includes("KnowledgeMode"),
  "knowledge modules should expose topic, mode, and internal source metadata",
);
assert(
  legacyKnowledge.includes("export * from \"./knowledge/index\""),
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
assert(
  !coachRoute.includes("ORDER BY created_at DESC LIMIT 1"),
  "coach route must not attach requests to the latest conversation implicitly",
);
assert(
  coachRoute.includes("conversationId"),
  "coach route should use an explicit conversationId for follow-up messages",
);
assert(
  coachRoute.includes("objection_followup"),
  "coach route should support explicit objection followup mode",
);
assert(
  coachRoute.includes("pre_meeting_prep"),
  "coach route should support explicit pre-meeting prep mode",
);
assert(
  coachRoute.includes("meeting_review"),
  "coach route should support explicit meeting review mode",
);
assert(
  coachRoute.includes("buildCoachMessages") &&
    coachPrompt.includes("buildObjectionModeInstructions"),
  "coach route should use the shared prompt builder with objection followup instructions",
);
assert(
  coachPrompt.includes("buildPreMeetingPrepModeInstructions"),
  "shared coach prompt should apply pre-meeting prep mode instructions",
);
assert(
  coachPrompt.includes("buildMeetingReviewModeInstructions"),
  "shared coach prompt should apply meeting review mode instructions",
);
assert(
  coachRoute.includes("normalizeObjectionFollowupData"),
  "coach route should normalize objection followup payloads",
);
assert(
  coachRoute.includes("normalizePreMeetingPrepData"),
  "coach route should normalize pre-meeting prep payloads",
);
assert(
  coachRoute.includes("normalizeMeetingReviewData"),
  "coach route should normalize meeting review payloads",
);
assert(
  coachRoute.includes("meetingReviewFields"),
  "coach route should scan meeting review payloads for prompt injection",
);
assert(
  coachRoute.includes("hasObjectionPayload"),
  "coach route should allow objection followup conversation follow-ups without requiring the first-submit payload again",
);
assert(
  coachPrompt.includes("selectModules(kycData, params.mode, params.question)") &&
    coachPrompt.includes("selectModulesForFollowUp(kycData, params.mode, params.question)"),
  "shared coach prompt should pass mode and user input into knowledge selection",
);
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

const webHome = read("src/app/page.tsx");
assert(
  webHome.includes("ObjectionFollowupForm"),
  "web app should expose the customer objection followup form",
);
assert(
  webHome.includes("mode: options.mode || \"diagnosis\""),
  "web app should send explicit coach mode to the coach API",
);
assert(
  webHome.includes("conversationMode") && webHome.includes("mode: conversationMode"),
  "web app should preserve coach mode for follow-up questions",
);

const objectionForm = read("src/components/ObjectionFollowupForm.tsx");
assert(
  !objectionForm.includes("@/lib/objection-followup\""),
  "web objection form must not import server-side objection prompt helpers into the browser bundle",
);

const miniCoach = read("miniprogram/pages/coach/coach.js");
const miniCoachWxml = read("miniprogram/pages/coach/coach.wxml");
const miniCoachWxss = read("miniprogram/pages/coach/coach.wxss");
const miniClients = read("miniprogram/pages/clients/clients.js");
const miniClientsWxml = read("miniprogram/pages/clients/clients.wxml");
assert(
  miniCoach.includes("onShareAppMessage") &&
    miniCoach.includes("onShareTimeline") &&
    miniCoach.includes("wx.showShareMenu") &&
    miniCoach.includes('"shareAppMessage"') &&
    miniCoach.includes('"shareTimeline"') &&
    miniCoach.includes('path: "/pages/coach/coach"'),
  "mini program coach page should enable official friend and Moments sharing",
);
assert(
  miniCoachWxml.includes('open-type="share"') &&
    miniCoachWxml.includes("share-entry-btn"),
  "mini program coach page should use a native button for friend sharing",
);
assert(
  !miniCoach.includes("?clientId=") &&
    !miniCoach.includes("&clientId=") &&
    !miniCoach.includes("?conversationId=") &&
    !miniCoach.includes("&conversationId=") &&
    !miniCoach.includes("?clientName="),
  "mini program share paths must not expose customer or conversation identifiers",
);
assert(
  miniCoach.includes("submitObjectionFollowup"),
  "mini program should expose customer objection followup submission",
);
assert(
  miniCoach.includes("submitPreMeetingPrep"),
  "mini program should expose pre-meeting prep submission",
);
assert(
  miniCoach.includes("submitMeetingReview"),
  "mini program should expose meeting review submission",
);
assert(
  miniCoach.includes("mode: \"objection_followup\""),
  "mini program should send explicit objection followup mode",
);
assert(
  miniCoach.includes("mode: \"pre_meeting_prep\"") &&
    miniCoach.includes("preMeetingPrep:"),
  "mini program should send explicit pre-meeting prep mode and payload",
);
assert(
  miniCoach.includes("mode: \"meeting_review\"") &&
    miniCoach.includes("meetingReview:"),
  "mini program should send explicit meeting review mode and payload",
);
assert(
  miniCoach.includes("conversationMode") && miniCoach.includes("mode: self.data.conversationMode"),
  "mini program should preserve coach mode for follow-up questions",
);
assert(
  miniCoach.includes("preMeetingPrepForm") &&
    miniCoachWxml.includes("见前准备") &&
    miniCoachWxml.includes("面谈作战卡"),
  "mini program should render the pre-meeting prep form entry",
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
assert(
  miniCoach.includes("applyCoachStreamError") &&
    miniCoach.includes("抱歉，AI 服务暂时不可用") &&
    !miniCoach.includes('reject(new Error(msg.msg || "服务错误"));'),
  "mini program should display server stream errors instead of masking them as empty responses",
);
assert(
  miniCoach.includes("noStream: true") &&
    !miniCoach.includes("enableChunked: true") &&
    !miniCoach.includes("onChunkReceived"),
  "mini program coach requests should use non-streaming JSON to avoid lost chunk completion in WeChat",
);
assert(
  miniCoach.includes("loadingSeconds") &&
    miniCoach.includes("_loadingStartedAt") &&
    miniCoach.includes("Math.floor(elapsed / 8)"),
  "mini program coach loading should show elapsed wait time and steady progress stages",
);
assert(
  miniCoachWxml.includes("完整生成后会一次展示") &&
    miniCoachWxml.includes("loadingSeconds"),
  "mini program coach loading bubble should explain full-response waiting instead of looking stuck",
);
assert(
  miniClients.includes("openConversation") &&
    miniClientsWxml.includes("历史记录") &&
    miniClientsWxml.includes("selected.conversations"),
  "mini program client detail should show customer conversation history",
);
assert(
  miniCoach.includes("lightClientName") &&
    miniCoach.includes("_ensureLightClientContext") &&
    miniCoach.includes("请先选择客户或填写客户称呼") &&
    miniCoach.includes("api.post(\"/api/clients\""),
  "mini program lightweight coach modes should create and bind a customer before submission",
);
assert(
  miniCoach.includes("selectedClientName") &&
    miniCoachWxml.includes("客户归属") &&
    miniCoachWxml.includes("提交时会自动建档"),
  "mini program lightweight coach modes should clearly show customer ownership before submission",
);
assert(
  !miniCoachWxml.includes("client-picker-btn"),
  "mini program coach top bar should not expose a duplicate customer picker",
);
assert(
  !miniCoachWxml.includes('class="client-context-card" wx:if="{{workMode !== \'diagnosis\'}}"') &&
    miniCoachWxml.includes("按下方名称自动建档") &&
    miniCoachWxml.includes("已读取该客户档案，本次诊断会保存到客户历史记录"),
  "mini program customer diagnosis should show explicit customer ownership and save destination",
);
assert(
  miniCoachWxml.includes("client-context-new") &&
    miniCoachWxss.includes(".client-context-new") &&
    miniCoachWxml.includes("选择已有客户") &&
    !miniCoachWxml.includes("点击顶部「+ 新建客户」"),
  "mini program diagnosis new-customer ownership should be neutral and guide copy should match the current flow",
);
assert(
  miniCoach.includes("loadClientForDiagnosisForm") &&
    miniCoach.includes("继续填写诊断") &&
    miniCoach.includes("self.loadClientForDiagnosisForm(id)"),
  "mini program selecting a customer in diagnosis should keep the agent in the diagnosis form",
);
assert(
  miniClients.includes("recentConversations") &&
    miniClients.includes("openRecentConversation") &&
    miniClientsWxml.includes("最近教练记录"),
  "mini program clients page should expose recent coach records for finding unbound history",
);
assert(
  miniClients.includes("typeLabel") &&
    miniClientsWxml.includes("history-type"),
  "mini program customer history should render conversation type labels",
);
assert(
  miniCoachWxml.includes("客户诊断") &&
    miniCoachWxml.includes("补充更多客户信息") &&
    miniCoach.includes("showDeepDiagnosisFields") &&
    miniCoach.includes("toggleDeepDiagnosisFields") &&
    miniCoach.includes("DIAGNOSIS_SUPPLEMENT_SECTIONS") &&
    !miniCoachWxml.includes("quick-mode-toggle") &&
    !miniCoachWxml.includes("深度诊断") &&
    !miniCoachWxml.includes("完整诊断") &&
    !miniCoach.includes("quickMode") &&
    !miniCoach.includes("toggleQuickMode"),
  "mini program customer diagnosis should be a single progressive form without quick/deep mode switching",
);
assert(
  miniCoach.includes("QUICK_REQUIRED_FIELDS") &&
    miniCoach.includes("for (var i = 0; i < QUICK_REQUIRED_FIELDS.length; i++)"),
  "mini program quick diagnosis should only block on fields marked required in the quick form",
);
assert(
  miniCoach.includes("loadConversationById") &&
    miniCoach.includes("openConversation") &&
    miniCoach.includes("/api/conversations/"),
  "mini program coach page should open a selected historical conversation",
);

const clientsDetailRoute = read("src/app/api/clients/[id]/route.ts");
const conversationsRoute = read("src/app/api/conversations/route.ts");
assert(
  clientsDetailRoute.includes("messages") &&
    clientsDetailRoute.includes("preview") &&
    clientsDetailRoute.includes("clientId"),
  "client detail API should return conversation previews and client ids for history rows",
);
assert(
  conversationsRoute.includes("c.client_id") &&
    conversationsRoute.includes("clientId"),
  "conversation list API should return client ids so recent history can reopen with ownership",
);

const miniPoints = read("miniprogram/pages/points/points.js");
assert(
  !miniPoints.includes("wx.requestPayment"),
  "mini program point purchases must use official virtual payment only",
);
assert(
  miniPoints.includes("mode: vp.mode") && miniPoints.includes("signature: vp.signature"),
  "mini program virtual payment must pass official mode and user signature",
);
assert(
  !miniPoints.includes("offerId: vp.offerId") && !miniPoints.includes("buyQuantity: 1"),
  "mini program virtual payment must keep purchase fields inside signData",
);
assert(
  !miniPoints.includes("网页端") && !miniPoints.includes("baojiaolian.com.cn"),
  "mini program must not guide virtual product purchases to external web recharge",
);

const midasClient = read("src/lib/midas.ts");
assert(
  midasClient.includes("mode: \"short_series_goods\""),
  "virtual payment params should use official goods mode",
);
assert(
  midasClient.includes("goodsPrice") && midasClient.includes("signature"),
  "virtual payment params should include official goodsPrice and user signature",
);
assert(
  !midasClient.includes("offer_id") &&
    !midasClient.includes("buy_quantity") &&
    !midasClient.includes("out_trade_no"),
  "virtual payment signData should use official camelCase wx.requestVirtualPayment fields",
);
assert(
  midasClient.includes("requestVirtualPayment") && midasClient.includes("uri + \"&\" + signData"),
  "virtual payment paySig should sign the requestVirtualPayment URI plus signData",
);

const gitignore = read(".gitignore");
assert(
  /^\.env$/m.test(gitignore),
  ".env must be ignored so local secrets are not tracked again",
);

const vercelignore = read(".vercelignore");
assert(
  /^\.env$/m.test(vercelignore) && /^\.env\.\*$/m.test(vercelignore),
  ".env files must be excluded from local Vercel deployment bundles",
);
