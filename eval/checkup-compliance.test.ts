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

test("catches rate wording without a premium quote", () => {
  const risks = scanCheckupCompliance("费率表显示年化收益演示。");
  assert.ok(risks.some((risk) => risk.code === "premium_quote"));
});

test("catches guarantees and fear", () => {
  const risks = scanCheckupCompliance("保证领取，稳赚不赔；再不买就晚了。");
  assert.ok(risks.some((risk) => risk.code === "guarantee"));
  assert.ok(risks.some((risk) => risk.code === "fear"));
});

test("catches claim promises", () => {
  const risks = scanCheckupCompliance("这种情况一定赔，理赔没问题。");
  assert.ok(risks.some((risk) => risk.code === "claim"));
});

test("catches peer blame", () => {
  const risks = scanCheckupCompliance("原代理人没讲清楚，别家公司不好。");
  assert.ok(risks.some((risk) => risk.code === "peer_blame"));
});

test("catches underwriting predictions", () => {
  const risks = scanCheckupCompliance("这种情况顶多加费，肯定承保。");
  assert.ok(risks.some((risk) => risk.code === "underwriting"));
});

test("catches legal conclusions", () => {
  const risks = scanCheckupCompliance("这份保单一定有效，肯定能避债。");
  assert.ok(risks.some((risk) => risk.code === "legal_advice"));
});

test("safe text passes", () => {
  assert.equal(scanCheckupCompliance("建议先核对合同责任和现金价值，具体以正式条款为准。").length, 0);
});

test("report disclaimer with 非保费报价 passes", () => {
  assert.equal(scanCheckupCompliance("预算参考，非保费报价，非产品推荐。").length, 0);
});

test("compliance guard rewrites risky text", async () => {
  const result = await ensureCheckupCompliance("保证领取，稳赚不赔。", async () => "建议以合同载明的保证利益为准，不承诺收益。");
  assert.equal(result.rewritten, true);
  assert.ok(result.content.includes("不承诺收益"));
});

test("compliance guard does not rewrite safe text", async () => {
  let rewriteCalls = 0;
  const result = await ensureCheckupCompliance(
    "建议先核对合同责任和现金价值，具体以正式条款为准。",
    async () => {
      rewriteCalls += 1;
      return "不应调用";
    },
  );
  assert.equal(rewriteCalls, 0);
  assert.equal(result.rewritten, false);
  assert.deepEqual(result.risks, []);
});

test("compliance guard returns safe fallback when rewrite is still risky", async () => {
  const result = await ensureCheckupCompliance("保证领取，稳赚不赔。", async () => "放心，稳赚不赔。");
  assert.equal(result.rewritten, true);
  assert.ok(result.risks.length > 0);
  assert.match(result.content, /以上不构成保险产品推荐或投保建议/);
  assert.doesNotMatch(result.content, /稳赚/);
  assert.equal(scanCheckupCompliance(result.content).length, 0);
});

test("compliance guard prefers a compliant rewrite over the fallback", async () => {
  const result = await ensureCheckupCompliance("这款产品费率 3%，一定赔。", async () => "理赔结论以合同和保险公司审核为准，具体利益以正式条款为准。");
  assert.equal(result.rewritten, true);
  assert.equal(result.content, "理赔结论以合同和保险公司审核为准，具体利益以正式条款为准。");
});
