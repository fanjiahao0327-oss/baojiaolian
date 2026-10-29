import test from "node:test";
import assert from "node:assert/strict";
import { buildV32Report, getFollowupCandidates, V32_BRANCHES, V32_FIXED, type V32Answer } from "../src/lib/checkup/v32";

const answers: V32Answer[] = [
  { questionId: "v32_q1", title: "触发点", prompt: "", answer: "我担心医疗和养老" },
  { questionId: "v32_q2", title: "家庭结构", prompt: "", answer: "夫妻和一个上小学的女儿，父母身体还好" },
  { questionId: "v32_q3", title: "医疗第一层", prompt: "", answer: "最担心治疗费和收入中断" },
  { questionId: "v32_q4", title: "收入结构", prompt: "", answer: "主要靠我一个人上班，收入这两年还算稳" },
  { questionId: "v32_q5", title: "养老第一层", prompt: "", answer: "希望退休后靠社保和存款，没想过具体哪一年" },
  { questionId: "v32_q6", title: "应急流动性", prompt: "", answer: "要凑一凑，钱大多在理财和房子里" },
  { questionId: "v32_q7", title: "优先级", prompt: "", answer: "先解决看病和收入中断" },
  { questionId: "v32_q8", title: "传承兜底", prompt: "", answer: "钱当然给孩子，但还没想过什么时候给、谁管" },
];

test("v3.2 是 6 个固定入口 + 7 个分支", () => {
  assert.equal(V32_FIXED.length, 6);
  assert.equal(Object.keys(V32_BRANCHES).length, 7);
  for (const route of Object.values(V32_BRANCHES)) {
    assert.ok(route.q3.prompt.length > 5);
    assert.ok(route.q5.prompt.length > 5);
    assert.ok(route.q3.source.length > 3);
  }
});

test("风险追问只选时间/人/家企三类", () => {
  const candidates = getFollowupCandidates(answers);
  assert.ok(candidates.some((item) => item.id === "A"));
  assert.ok(candidates.some((item) => item.id === "B"));
});

test("企业主 Q4 才会触发家企追问", () => {
  const business = [...answers, { questionId: "v32_q4", title: "收入", prompt: "", answer: "我自己开公司，有贷款和担保" }];
  assert.ok(getFollowupCandidates(business).some((item) => item.id === "C"));
  assert.ok(!getFollowupCandidates(answers).some((item) => item.id === "C"));
});

test("报告只出三档风险地图，不出分数", () => {
  const report = buildV32Report(answers);
  assert.equal(report.dimensions.length, 5);
  for (const item of report.dimensions) {
    assert.ok(["有安排", "空白", "待确认"].includes(item.status));
    assert.ok(!/分$/.test(item.evidence));
  }
  assert.ok(report.risks.length >= 1);
  assert.ok(report.pending.length >= 3);
  assert.ok(!/\d+\s*分(?!钟)/.test(JSON.stringify(report)));
});
