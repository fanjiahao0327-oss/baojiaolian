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

test("covers the remaining domains", () => {
  assert.equal(triageFromText("住院花了不少，外购药也不报销").primaryDomain, "medical");
  assert.equal(triageFromText("孩子上学的学费和留学费用压力大").primaryDomain, "education");
  assert.equal(triageFromText("担心退休后养老金不够").primaryDomain, "retirement");
  assert.equal(triageFromText("担心离婚时配偶分财产").primaryDomain, "marriage");
});
