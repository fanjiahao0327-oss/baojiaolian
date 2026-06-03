import type { KnowledgeModule } from "./types";

export const SAVINGS_DIVIDEND_MODULES: KnowledgeModule[] = [
  {
    id: "dividend_interest_rate_shift",
    title: "分红险与利率变化",
    tier: "product",
    topics: ["dividend", "savings"],
    modes: ["all"],
    sourceRefs: ["savings-dividend:rate-shift"],
    content: `
# 分红/储蓄险的市场变化

731 之后，单纯讲固定利率或预定利率优势的卖法变弱。客户会拿银行、基金、国债、其他公司收益来比较。如果代理人只讲收益，很容易陷入产品对比和承诺收益风险。

## 新表达重点

- 从“收益多少”转向“这笔钱未来一定要用在哪里”。
- 从“产品更好”转向“现有方式是否能保证长期目标实现”。
- 从“利率优势”转向“制度约束、长期确定性、现金流安排和专款专用”。
- 分红险可以讲利益演示和机制边界，但不能承诺分红、收益或最终领取金额。

## 推荐姿态

“收益当然重要，但我们先不急着比较哪个数字更高。教育、养老、传承这类钱，最关键不是某一年赚多少，而是到了那个时间点，这笔钱能不能确定在、能不能按计划用、会不会中途被挪走。”
`,
  },
  {
    id: "savings_goal_discovery",
    title: "储蓄类目标发现",
    tier: "product",
    topics: ["savings", "education", "retirement", "inheritance", "need_discovery"],
    modes: ["diagnosis", "pre_meeting_prep", "meeting_review"],
    sourceRefs: ["savings-dividend:goal-discovery"],
    content: `
# 储蓄类产品先找长期目标

储蓄类保险不是先讲产品，而是先确认客户有没有长期、确定、不能失败的目标。

## 常见目标

- 教育：孩子是否有私立、国际学校、留学、研究生等期待。
- 养老：什么时候退休，退休后在哪生活，想要怎样的生活品质。
- 传承：想给孩子留一笔确定的钱，是否担心婚姻、债务、挥霍或分配不清。

## 提问原则

- 问小而具体的问题，不要一上来问“你养老要多少钱”。
- 顺着客户会笑、会期待、会展开想象的画面聊。
- 如果客户没有期待，不硬推储蓄险。
`,
  },
  {
    id: "education_retirement_visualization",
    title: "教育金与养老金画面感",
    tier: "product",
    topics: ["savings", "education", "retirement", "need_intensify"],
    modes: ["diagnosis", "pre_meeting_prep", "meeting_review"],
    sourceRefs: ["savings-dividend:visualization"],
    content: `
# 教育金和养老金的画面感

储蓄类产品的动机强化不是恐惧，而是把客户真正想要的未来画面聊清楚。必须从小问题开始，由近及远。

## 教育金

从孩子当前阶段问起：

- “孩子现在几年级？”
- “小学/初中打算走公立还是私立？”
- “以后更偏国内高考，还是也考虑国际路线？”
- “如果真走国际路线，更想去美国、英国还是澳洲？”

客户开始具体想象后，再讨论费用和准备方式。

## 养老金

从退休生活问起：

- “你们有没有想过什么时候退休？”
- “退休后还留在这个城市，还是想去风景好的地方住一段？”
- “如果一年有半年旅居，你最想去哪里？”

先把美好画面聊出来，再做刚性需求和弹性需求区分。
`,
  },
  {
    id: "savings_solution_gap",
    title: "储蓄类现有方式缺口",
    tier: "product",
    topics: ["savings", "solution_gap"],
    modes: ["diagnosis", "meeting_review", "objection_followup"],
    sourceRefs: ["savings-dividend:solution-gap"],
    content: `
# 储蓄类保险是补足方案

客户已有基金、股票、房产、定存、国债或自己存钱时，不要批评。储蓄类保险不是否定现有方式，而是补足现有方式在长期目标中的缺口。

## 对话顺序

1. 肯定现有方式：“你已经有规划意识，这点非常好。”
2. 了解目标：“这笔钱未来最希望用在教育、养老还是传承？”
3. 客观看缺口：“这些方式能不能保证到那个时间点一定在、一定能用、不会中途挪走？”
4. 给补足方案：“高弹性的目标可以用投资工具，刚性的底线部分更适合用安全确定、有约束的方式准备。”
`,
  },
  {
    id: "appropriation_interest_usage_risks",
    title: "挪用、利率、使用期风险",
    tier: "product",
    topics: ["savings", "retirement", "dividend", "solution_gap"],
    modes: ["diagnosis", "objection_followup", "meeting_review"],
    sourceRefs: ["savings-dividend:risks"],
    content: `
# 储蓄类三类关键风险

## 1. 挪用风险

中长期目标最怕中途被人性挪用。可以问：

“你还记得自己第一次存到 10 万、30 万、50 万时，最后这笔钱用到哪里了吗？”

如果客户过往一到大额就买车、换房、装修、投资或消费，说明需要制度约束。

## 2. 利率下行风险

适合很自律、喜欢定存/国债/低风险理财的客户。可以问：

“你刚开始存钱时，存款利率大概是多少？五年前是多少？现在是多少？如果当年有个方式能锁定更长期的确定利率，你现在回头看会不会觉得有价值？”

## 3. 使用期风险

养老和传承的钱不是存到某一天就结束，而是要用很久。长寿、亲戚借用、子女照护、人情压力都可能影响使用。

边界：只做场景探问，不渲染家庭冲突和人性恐惧。
`,
  },
  {
    id: "inheritance_marriage_debt_risks",
    title: "传承、婚姻、债务风险",
    tier: "product",
    topics: ["inheritance", "savings", "objection"],
    modes: ["diagnosis", "pre_meeting_prep", "meeting_review"],
    sourceRefs: ["savings-dividend:inheritance"],
    content: `
# 传承类需求的温和探问

传承、婚姻、债务风险很敏感，不能制造家庭矛盾，也不能暗示客户子女或伴侣一定有问题。正确做法是温和确认客户是否有“想安排得更确定”的期待。

## 可问方向

- “如果未来给孩子留一笔钱，你更希望他自由使用，还是希望这笔钱能在关键节点上帮到他？”
- “如果孩子未来结婚，你会不会希望有些资产边界更清楚一点？”
- “如果家庭里有人做生意或有负债风险，你会不会希望给家人留一块更稳、更不容易受影响的钱？”

## 边界

- 不制造婚姻焦虑。
- 不评价客户家人。
- 不承诺保险一定隔离所有风险，具体法律和条款问题需要专业人士确认。
`,
  },
];
