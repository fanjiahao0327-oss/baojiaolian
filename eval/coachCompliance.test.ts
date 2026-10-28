import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("coach compliance scanner detects the five production risk families", async () => {
  const compliance = await import("../src/lib/coach-compliance").catch(
    () => ({} as Record<string, unknown>),
  );

  assert.equal(typeof compliance.scanCoachCompliance, "function");
  const scanCoachCompliance = compliance.scanCoachCompliance as (
    content: string,
  ) => Array<{ code: string }>;

  const risks = scanCoachCompliance(`
它肯定增值，过了回本点再取就不亏。
只要有人帮忙跑腿，理赔一般就没问题。
原来的销售人员没有把情况讲清楚。
正常告知后顶多就是甲状腺除外。
自己做生意，连生病的资格都没有。
  `);

  assert.deepEqual(
    new Set(risks.map((risk) => risk.code)),
    new Set([
      "benefit_guarantee",
      "claim_guarantee",
      "peer_blame",
      "underwriting_prediction",
      "fear_pressure",
    ]),
  );
});

test("coach compliance scanner accepts bounded factual wording", async () => {
  const { scanCoachCompliance } = await import("../src/lib/coach-compliance");

  const risks = scanCoachCompliance(`
写入合同的保证利益与分红等非保证利益需要分开理解，具体以合同、利益演示和现金价值表为准。
理赔结论由保险公司依据合同责任和提交材料审核，代理人只能协助整理材料和跟进流程。
在看到原保单和理赔决定书之前，不评价原代理人或保险公司。
核保可能出现标准体、加费、除外、延期或拒保，最终以保险公司的正式核保结论为准。
先肯定客户已有的规划方式，再比较不同工具的用途与风险。
  `);

  assert.deepEqual(risks, []);
});

test("coach compliance scanner catches disguised deterministic payout wording", async () => {
  const { scanCoachCompliance } = await import("../src/lib/coach-compliance");
  const risks = scanCoachCompliance("年金险回答的是每个月确定能拿到多少。");

  assert.deepEqual(risks.map((risk) => risk.code), ["benefit_guarantee"]);
});

test("compliance rewrite prompt names detected risks and requests a full rewrite", async () => {
  const compliance = await import("../src/lib/coach-compliance");
  const risks = compliance.scanCoachCompliance("它肯定增值，顶多就是除外。");
  const prompt = compliance.buildCoachComplianceRewritePrompt(risks);

  assert.match(prompt, /收益或保险利益承诺/);
  assert.match(prompt, /核保结论预判/);
  assert.match(prompt, /重写完整回答/);
  assert.match(prompt, /不要解释修改过程/);
});

test("compliance guard rewrites only risky answers and accepts a safe rewrite", async () => {
  const compliance = await import("../src/lib/coach-compliance");
  let rewriteCalls = 0;

  const result = await compliance.ensureCoachResponseCompliance(
    "这个产品肯定增值。",
    async (prompt) => {
      rewriteCalls += 1;
      assert.match(prompt, /收益或保险利益承诺/);
      return "具体利益需要区分保证利益与非保证利益，并以正式合同和利益演示为准。";
    },
  );

  assert.equal(rewriteCalls, 1);
  assert.equal(result.rewritten, true);
  assert.equal(
    result.content,
    "具体利益需要区分保证利益与非保证利益，并以正式合同和利益演示为准。",
  );
});

test("compliance guard does not call the rewrite model for a safe answer", async () => {
  const compliance = await import("../src/lib/coach-compliance");
  let rewriteCalls = 0;

  const result = await compliance.ensureCoachResponseCompliance(
    "理赔结论由保险公司依据合同和材料审核。",
    async () => {
      rewriteCalls += 1;
      return "不应调用";
    },
  );

  assert.equal(rewriteCalls, 0);
  assert.equal(result.rewritten, false);
});

test("compliance guard returns a safe fallback when the rewrite still violates rules", async () => {
  const compliance = await import("../src/lib/coach-compliance");
  const result = await compliance.ensureCoachResponseCompliance(
    "它肯定增值。",
    async () => "放心，它保证收益。",
  );

  assert.equal(result.rewritten, true);
  assert.match(result.content, /为避免形成不准确承诺/);
  assert.doesNotMatch(result.content, /保证收益/);
});

test("production coach prompt contains explicit claim, benefit, peer, and underwriting boundaries", async () => {
  const { buildCoachSystemPrompt } = await import("../src/lib/coach-prompt");
  const { systemPrompt } = buildCoachSystemPrompt({
    mode: "diagnosis",
    question: "如何回应客户的理赔和收益问题？",
    kycData: {},
  });

  assert.match(systemPrompt, /保证利益与非保证利益/);
  assert.match(systemPrompt, /理赔结论只能依据具体合同和保险公司审核/);
  assert.match(systemPrompt, /不得归责原代理人、原销售人员、保险公司或同业/);
  assert.match(systemPrompt, /标准体、加费、除外、延期、拒保/);
  assert.match(systemPrompt, /最终以保险公司的正式核保结论为准/);
});

test("production knowledge no longer teaches deterministic benefit or underwriting claims", async () => {
  const { ALL_MODULES } = await import("../src/lib/knowledge");
  const content = ALL_MODULES.map((module) => module.content).join("\n");

  assert.doesNotMatch(content, /保证本金永远在市场上/);
  assert.doesNotMatch(content, /都会变成除外责任或加费/);
  assert.doesNotMatch(content, /别人拿不走的钱/);
});

test("production and eval coach generation both run the shared compliance guard", () => {
  const routeSource = fs.readFileSync("src/app/api/coach/route.ts", "utf8");
  const adapterSource = fs.readFileSync("eval/coachAdapter.ts", "utf8");

  assert.match(routeSource, /ensureCoachResponseCompliance/);
  assert.match(adapterSource, /ensureCoachResponseCompliance/);
});
