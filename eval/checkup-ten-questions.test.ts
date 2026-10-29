import test from "node:test";
import assert from "node:assert/strict";
import { TEN_FIXED_QUESTIONS, buildTenSummary, tenAnswersToStructured } from "../src/lib/checkup/ten-questions";
import { buildIndexInputFromAnswers } from "../src/lib/checkup/index-input";
import { calcAllIndices } from "../src/lib/checkup/indices";

test("10 题标准有 8 个固定风险域", () => {
  assert.equal(TEN_FIXED_QUESTIONS.length, 8);
  const ids = TEN_FIXED_QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, 8);
  for (const q of TEN_FIXED_QUESTIONS) {
    assert.ok(q.prompt.length > 20);
    assert.ok(q.guidance.length > 10);
    assert.ok(q.source.length > 5);
    assert.ok(q.purpose.length > 5);
  }
});

test("固定题覆盖家庭、职业、健康、养老、传承、婚姻、教育、资产", () => {
  const text = TEN_FIXED_QUESTIONS.map((q) => `${q.title}${q.prompt}`).join(" ");
  for (const word of ["家庭", "职业", "健康", "养老", "传承", "婚姻", "教育", "资产"]) {
    assert.ok(text.includes(word), word);
  }
});

test("summary 会列出未回答的题", () => {
  const answers = TEN_FIXED_QUESTIONS.slice(0, 7).map((q) => ({ questionId: q.id, title: q.title, prompt: q.prompt, answer: "说了一些" }));
  const summary = buildTenSummary(answers);
  assert.equal(summary.sections.length, 7);
  assert.equal(summary.missing.length, 1);
  assert.ok(summary.missing[0].includes("资产"));
});


test("10 题固定回答能映射成结构化字段，并算出五维自检", () => {
  const answers = [
    { questionId: "ten_family", title: "家庭", prompt: "", answer: "我38岁，普通职工，老婆也是上班族，一个孩子上小学；父母身体还可以，有一个弟弟。" },
    { questionId: "ten_occupation", title: "职业", prompt: "", answer: "我和老婆都上班，收入算稳定，家庭年收入大概30-60万；没有企业，没有个人担保。" },
    { questionId: "ten_health", title: "健康", prompt: "", answer: "只有社保，没有商业医疗和重疾；住院最担心治疗费和收入中断。" },
    { questionId: "ten_retirement", title: "养老", prompt: "", answer: "希望55岁左右退休，主要靠社保和存款，没有房租年金。" },
    { questionId: "ten_inheritance", title: "传承", prompt: "", answer: "钱想留给孩子，孩子结婚时给一部分，剩下的想分批；现在没有遗嘱信托，保单也没写受益人；最怕孩子婚姻变化被分走。" },
    { questionId: "ten_marriage", title: "婚姻", prompt: "", answer: "初婚，没有婚前协议，配偶没有经营负债。" },
    { questionId: "ten_education", title: "教育", prompt: "", answer: "孩子上小学，打算国内读大学，教育金还没专门准备。" },
    { questionId: "ten_financial", title: "财务", prompt: "", answer: "年收入30-60万，年支出10-30万，流动资产50万以下，固定资产100-300万，房贷100万以下，传承资产没有。" },
  ];
  const structured = tenAnswersToStructured(answers);
  const byId = new Map(structured.map((item) => [item.questionId, item.value]));
  assert.equal(byId.get("cashflow_income_range"), "30_60");
  assert.equal(byId.get("cashflow_expense_range"), "10_30");
  assert.equal(byId.get("assets_liquid"), "under50");
  assert.equal(byId.get("assets_fixed"), "100_300");
  assert.equal(byId.get("assets_debt"), "under100");
  assert.equal(byId.get("family_children"), "school");
  assert.equal(byId.get("family_business"), "none");
  const indices = calcAllIndices(buildIndexInputFromAnswers(structured));
  for (const item of indices) assert.notEqual(item.score, null, item.name);
});
