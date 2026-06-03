import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

const coachRoute = read("src/app/api/coach/route.ts");
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
  coachRoute.includes("buildObjectionModeInstructions"),
  "coach route should apply objection followup mode instructions",
);
assert(
  coachRoute.includes("buildPreMeetingPrepModeInstructions"),
  "coach route should apply pre-meeting prep mode instructions",
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
  coachRoute.includes("hasObjectionPayload"),
  "coach route should allow objection followup conversation follow-ups without requiring the first-submit payload again",
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
assert(
  miniCoach.includes("submitObjectionFollowup"),
  "mini program should expose customer objection followup submission",
);
assert(
  miniCoach.includes("submitPreMeetingPrep"),
  "mini program should expose pre-meeting prep submission",
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
