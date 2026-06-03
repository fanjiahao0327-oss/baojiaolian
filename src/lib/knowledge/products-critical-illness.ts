import type { KnowledgeModule } from "./types";

export const CRITICAL_ILLNESS_MODULES: KnowledgeModule[] = [
  {
    id: "critical_illness_positioning",
    title: "重疾险定位",
    tier: "product",
    topics: ["critical_illness", "client_tier"],
    modes: ["all"],
    sourceRefs: ["critical-illness:positioning"],
    content: `
# 重疾险顾问式销售定位

重疾险不是储蓄险时代可以忽略的品类，而是保险代理人的基本功。监管回归“保险姓保”，客户也会持续面对疾病、收入中断和家庭责任问题。

## 不同客户层级的重疾价值

- 典型中产：重疾险解决因病返贫和收入中断，保护家庭现金流。
- 富裕中产：重疾险解决生活品质不能下降，保护孩子教育、房贷、家庭支出和未来选择权。
- 高净值：重疾险本身不是唯一卖点，更要结合优质医疗资源、早筛、特需/国际部、康复服务等资源型价值。

## 面谈边界

- 不要把重疾险讲成“治病报销工具”。
- 不要制造“以后买不了”的恐惧。
- 不要一上来讲产品责任、病种数量或价格。
- 先确认客户对身体、收入、家庭责任是否真的有担心。
`,
  },
  {
    id: "medical_vs_ci_cashflow",
    title: "医疗险与重疾现金流分工",
    tier: "product",
    topics: ["critical_illness", "medical"],
    modes: ["diagnosis", "objection_followup", "pre_meeting_prep", "meeting_review"],
    sourceRefs: ["critical-illness:medical-vs-ci"],
    content: `
# 医疗险与重疾险的分工

客户说“我有百万医疗了”时，不要反驳。这说明客户理解报销逻辑，是好事。正确做法是把逻辑从“医院账单”切到“家庭现金流”。

## 分工

- 医疗险管发票：住院、手术、检查、治疗等可以报销的费用。
- 重疾险管生活：康复期收入中断、护工营养、康复训练、房贷、孩子教育、父母赡养、家庭生活品质。

## 推荐表达

“你说得对，医疗险确实管医院账单。但病床上躺着和出院康复那几年，工资卡可能是不进钱的。医疗险报得了发票，报不了房贷、生活费、父母那份心，也报不了几年不能正常工作的收入缺口。医疗险让医院账单有人付，重疾险让回家以后的生活有人撑着。”

## 禁止表达

- 不要说“医疗险没用”。
- 不要把医药费算进重疾保额里。
- 不要用疾病恶化恐吓客户。
`,
  },
  {
    id: "ci_motivation_discovery",
    title: "重疾动机发现",
    tier: "product",
    topics: ["critical_illness", "need_discovery"],
    modes: ["diagnosis", "pre_meeting_prep", "meeting_review"],
    sourceRefs: ["critical-illness:motivation"],
    content: `
# 重疾险找动机

重疾险成交的第一层要素是客户对身体、工作强度、收入稳定性或家庭责任有真实担心。没有担心时，不要硬推。

## 主动咨询

客户说“我想买重疾险/大病险”时，使用积极导向提问：

“我印象中你身体一直挺好，看你平常状态也不错，怎么会突然想到要了解重疾险呢？”

如果客户只说“我想买个保险”，先用“保人/保钱”做选择题：

“保险通常解决两类问题，一类是保人的，比如生病出意外后的医疗和收入损失；另一类是保钱的，比如教育金、养老金。你现在更想优先解决哪一类？”

## 非主动咨询

先基于年龄、职业、家庭责任分析可能性，再用积极导向去敲身体和工作状态：

- “你这个阶段能力和收入都是黄金期，但节奏也确实很满。你会不会偶尔也担心，这种高强度状态能不能一直持续？”
- “你看起来状态挺好，是不是平常很注意运动和体检？你们这行工作强度这么大，平时怎么照顾身体？”

不要直接问“你是不是身体不好”。
`,
  },
  {
    id: "ci_sum_assured_generation",
    title: "重疾保额生成",
    tier: "product",
    topics: ["critical_illness", "need_intensify"],
    modes: ["diagnosis", "meeting_review"],
    sourceRefs: ["critical-illness:sum-assured"],
    content: `
# 重疾保额如何由客户自己算出来

保额不要由代理人拍脑袋建议，而要让客户参与计算。客户自己算出来的缺口，接受度更高。

## 顺序

1. 先共情身体和收入压力，让客户愿意肩并肩看问题。
2. 再算收入损失：如果 3 到 5 年不能像现在这样高强度工作，家庭现金流会少多少。
3. 再算康养现金流：护工、营养、康复训练、照护安排等很多不开票、不报销。
4. 最后合并确认：医疗险管发票，重疾险补现金流缺口。

## 推荐表达

“咱先不看产品，先看这个风险到底有多大。假如从住院到康复前后几年，你没法像现在这样工作，工资奖金会不会受影响？如果要保证家庭生活品质不下降，你觉得手上有多少钱才踏实？”

“再加上护工、营养、康复训练这些不一定能开发票的钱，几年下来是不是也得准备一笔现金？所以重疾险保的不是医院账单，而是你和家庭这几年不能断的生活。”
`,
  },
  {
    id: "premium_inversion_objection",
    title: "保费倒挂异议",
    tier: "objection",
    topics: ["critical_illness", "objection"],
    modes: ["objection_followup", "meeting_review", "diagnosis"],
    sourceRefs: ["critical-illness:premium-inversion"],
    content: `
# 保费倒挂不划算

客户说“缴费比保额还多，不划算”时，先承认客户算得对，再把视角从单点价格拉到时间轴和主动权。

## 处理步骤

1. 承认：“你这个算法没错，如果只看总保费和保额，确实会有这个感觉。”
2. 拉长时间轴：前期出险时累计保费远低于保额，保障杠杆仍然明显。
3. 讲主动权：后期觉得不划算，可以根据保单功能做调整，例如降低保额、减额付清或保留基础保障。
4. 回到真实问题：客户现在要的是拥有选择权，而不是等身体变化后完全没有选择权。

## 边界

- 不要说“你以后一定会生病”。
- 不要承诺具体保单功能，最终以正式条款为准。
- 不要把客户的精算意识当成阻力，先肯定其理性。
`,
  },
];
