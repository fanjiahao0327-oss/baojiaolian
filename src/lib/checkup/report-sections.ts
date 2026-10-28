import type { IndexInput } from "./indices";
import { getKnowledgeSnippet } from "./knowledge";
import type { Answer, RiskItem, WealthIndexScore } from "./types";

export interface ReportSection {
  title: string;
  paragraphs: string[];
}

interface BuildReportSectionsParams {
  answers: Answer[];
  indices: WealthIndexScore[];
  risks: RiskItem[];
  input: IndexInput;
  profile?: unknown;
}

const NOT_PROVIDED = "本次未提供";
const REPORT_DISCLAIMER =
  "本报告由规则与知识库辅助生成，仅供家庭风险自查参考，不构成保险产品推荐、投保建议、法律意见或税务意见。涉及继承、婚姻、信托、税务的具体安排，请咨询执业律师、税务师等专业人士。";

const OPTION_LABELS: Record<string, Record<string, string>> = {
  family_members: {
    couple: "夫妻两人",
    children: "夫妻与孩子",
    three_gen: "三代同堂",
    other: "其他",
  },
  family_children: {
    school: "孩子还在上学",
    working: "孩子已工作未婚",
    married: "孩子已结婚",
    none: "还没有孩子",
  },
  family_parents: {
    healthy: "父母身体健康，暂不需要照顾",
    financial: "父母需要经济支持",
    care: "父母需要日常照护",
    other: "父母情况为其他",
  },
  family_siblings: {
    only_child: "独生子女",
    harmony: "有兄弟姐妹，关系正常",
    conflict: "有兄弟姐妹，有分歧",
    skip: NOT_PROVIDED,
  },
  family_business: {
    none: "家里没有人做生意或持股",
    self: "本人经营企业或持股",
    family: "配偶或子女经营企业",
    passive: "有股权但未参与经营",
  },
  marriage_status: {
    first: "初婚",
    remarried: "再婚",
    divorced: "离异",
    widowed: "丧偶",
    skip: NOT_PROVIDED,
  },
  protection_medical: {
    million: "有百万医疗",
    mid_high: "有中高端医疗",
    social_only: "只有社保",
    unknown: "不清楚",
  },
  protection_critical: {
    none: "没有重疾险",
    under30: "重疾保额 30 万以下",
    "30_50": "重疾保额 30–50 万",
    over50: "重疾保额 50 万以上",
    unknown: "不清楚",
  },
  protection_life: {
    both: "寿险和意外险都有",
    accident_only: "只有意外险",
    life_only: "只有寿险",
    none: "都没有",
    unknown: "不清楚",
  },
  protection_runway: {
    under3: "应急金不足 3 个月",
    "3_6": "应急金 3–6 个月",
    "6_12": "应急金 6–12 个月",
    over12: "应急金 1 年以上",
    unknown: "说不清",
  },
  inheritance_intent: {
    documented: "已经写进文件",
    oral: "只口头跟家人说过",
    thought: "想过，但没安排",
    never: "还没想过",
    young: "孩子还小",
  },
  inheritance_tools: {
    will: "有遗嘱",
    trust: "有信托或保险金信托",
    beneficiary: "保单写了受益人",
    none: "都没有",
    unknown: "不清楚",
  },
  inheritance_when: {
    now: "现在就给",
    marriage: "孩子结婚时给",
    age35: "孩子 35 岁后给",
    batch: "分批给",
    not_thought: "没想好",
  },
  inheritance_control: {
    child: "孩子自己管",
    joint: "我和孩子一起管",
    conditions: "设条件分批给",
    not_thought: "没想好",
  },
  inheritance_worry: {
    split: "担心被分走",
    spend: "担心被挥霍",
    manage: "担心不会管",
    dispute: "担心家庭纠纷",
    none: "没有特别担心",
  },
  cashflow_income_stability: {
    stable: "稳定",
    fluctuating: "有波动",
    unstable: "不稳定",
    skip: NOT_PROVIDED,
  },
  education_stage: {
    preschool: "学龄前",
    primary: "小学",
    middle: "中学",
    college: "大学或留学",
    worked: "已工作",
  },
  education_plan: {
    none: "没有大额教育计划",
    domestic: "有国内大额教育计划",
    abroad: "有留学计划",
    undecided: "还没想好",
  },
  education_budget: {
    none: "没有专门准备",
    under30: "准备了 30 万以下",
    "30_100": "准备了 30–100 万",
    over100: "准备了 100 万以上",
    skip: NOT_PROVIDED,
  },
  retirement_age: {
    before50: "希望 50 岁前退休",
    "50_55": "希望 50–55 岁退休",
    "55_60": "希望 55–60 岁退休",
    after60: "希望 60 岁以后退休",
    never: "没想过",
  },
  retirement_income: {
    social: "主要靠社保",
    savings: "靠储蓄或理财",
    passive: "靠房租或年金",
    children: "靠子女",
    never: "没想过",
  },
  retirement_cashflow: {
    under5k: "希望每月 5000 以下",
    "5_10k": "希望每月 5000–1 万",
    "10_20k": "希望每月 1–2 万",
    over20k: "希望每月 2 万以上",
    not_thought: "没想过",
  },
  business_ownership: {
    none: "没有企业经营或股权",
    self: "本人经营",
    family: "家人经营",
    passive: "有股权但未参与",
  },
  business_guarantee: {
    none: "没有用个人或家庭资产担保",
    yes: "有用个人或家庭资产担保",
    unknown: "不清楚",
    no_business: "没有企业",
  },
  business_debt: {
    none: "没有企业负债",
    under100: "企业负债 100 万以下",
    "100_300": "企业负债 100–300 万",
    over300: "企业负债 300 万以上",
    skip: NOT_PROVIDED,
  },
  business_succession: {
    child: "希望孩子接班",
    professional: "考虑职业经理人",
    sell: "考虑出售或退出",
    not_thought: "没想好",
    no_business: "没有企业",
  },
  marriage_assets: {
    yes: "有书面财产约定",
    no: "没有书面财产约定",
    unknown: "不清楚",
    skip: NOT_PROVIDED,
  },
  marriage_spouse_debt: {
    none: "配偶没有经营负债或担保",
    yes: "配偶有经营负债或担保",
    unknown: "不清楚",
    skip: NOT_PROVIDED,
  },
};

const INDEX_MEANING: Record<string, string> = {
  安全指数: "看家庭遇到失业、疾病、意外时能不能扛住，由收支、负债、现金和三类保障六项平均。",
  流动指数: "看资产里有多少能在一个月内变现，衡量急用钱时拿不拿得出。",
  自由指数: "看被动收入能覆盖多少支出，衡量你离不靠工资生活有多远。",
  独立指数: "看现有资产覆盖了多少人生责任，包括生活、房贷、教育、赡养和养老。",
  传承指数: "看多少资产已通过保险、信托或遗嘱定向安排，而不是继续走法定继承。",
};

function valueOf(answers: Answer[], questionId: string): string | null {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer || answer.skipped || !answer.value) return null;
  return answer.value;
}

function labelOf(answers: Answer[], questionId: string): string {
  const value = valueOf(answers, questionId);
  if (!value) return NOT_PROVIDED;
  return OPTION_LABELS[questionId]?.[value] ?? value;
}

function hasAny(answers: Answer[], questionId: string, values: string[]): boolean {
  const value = valueOf(answers, questionId);
  return value !== null && values.includes(value);
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return NOT_PROVIDED;
  if (Math.abs(value) >= 10000) {
    const wan = value / 10000;
    return `${wan >= 100 ? Math.round(wan) : Math.round(wan * 10) / 10} 万`;
  }
  return `${Math.round(value)} 元`;
}

function percent(value: number): string {
  return `${Math.round(value)}%`;
}

function levelLabel(index: WealthIndexScore | undefined): string {
  if (!index || index.score === null) return "信息不足";
  if (index.level === "green") return "相对稳健";
  if (index.level === "yellow") return "需要关注";
  if (index.level === "red") return "存在明显缺口";
  return "信息不足";
}

function dataLabel(index: WealthIndexScore | undefined): string {
  if (!index) return "本次没有拿到这项指数的计算结果";
  if (index.dataStatus === "enough") return "数据较完整";
  if (index.dataStatus === "partial") return "部分数据缺失";
  return "数据不足";
}

function scoreLine(index: WealthIndexScore | undefined): string {
  if (!index) return "本次没有拿到这项指数的计算结果";
  if (index.score === null) return "本次信息不足，无法计算分数";
  const status = index.dataStatus === "enough" ? "" : `，${dataLabel(index)}`;
  return `本次 ${Math.round(index.score)} 分（${levelLabel(index)}${status}）`;
}

function indexOf(indices: WealthIndexScore[], name: WealthIndexScore["name"]): WealthIndexScore | undefined {
  return indices.find((item) => item.name === name);
}

function profileFamily(profile: unknown): string | null {
  if (typeof profile === "string") {
    const text = profile.trim();
    return text ? text : null;
  }
  if (profile && typeof profile === "object") {
    const record = profile as Record<string, unknown>;
    const family = record.familyStructure;
    if (typeof family === "string" && family.trim()) return family.trim();
  }
  return null;
}

function citationLabel(snippetId: string): string {
  const labels: Record<string, string> = {
    "index-safety": "安全指数",
    "index-liquidity": "流动指数",
    "index-freedom": "自由指数",
    "index-independence": "独立指数",
    "index-inheritance": "传承指数",
    "civil-code-1127-1128": "民法典第1127/1128条",
    "insurance-law-39-42": "保险法第39/42条",
    "marriage-property-1062-1063": "民法典第1062/1063条",
    "marriage-debt-1064": "民法典第1064条",
    "family-business-isolation": "家企隔离方法卡",
    "tool-will": "遗嘱工具说明",
    "tool-insurance-trust": "保险金信托说明",
    "tool-family-trust": "家族信托说明",
    "risk-66": "66问风险分类",
    "suying-kyc": "苏颖KYC方法卡",
    "inheritance-three-questions": "传承确权三问",
  };
  return labels[snippetId] ?? "家庭风险知识库";
}

function safeRiskText(text: string): string {
  return text.replace(/以上为风险自查参考[^。]*。?/g, "").trim();
}

function derivedLifeDebt(input: IndexInput): number | null {
  if (typeof input.lifeDebt === "number" && input.lifeDebt > 0) return input.lifeDebt;
  if (typeof input.annualExpense === "number" && input.annualExpense > 0) {
    return input.annualExpense * 25 + (input.totalDebt ?? 0);
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* 一、家庭结构与未来时间轴                                                   */
/* -------------------------------------------------------------------------- */

function childTimeline(value: string | null, years: 3 | 5 | 10): string {
  if (years === 3) {
    if (value === "school") return "孩子还在上学，升学、转学或课外投入可能形成一个支出高点。";
    if (value === "working") return "孩子已工作未婚，婚恋、购房或创业可能开始需要家庭支持。";
    if (value === "married") return "孩子已结婚，小家庭添丁、换房或创业都可能改变你给钱的节奏。";
    if (value === "none") return "目前还没有孩子，生育计划会直接影响未来 3 年的支出和保障。";
    return "子女情况本次未提供，未来 3 年的教育或婚育节点无法判断。";
  }
  if (years === 5) {
    if (value === "school") return "孩子可能进入大学或留学阶段，教育金会从“慢慢存”变成“按时付”。";
    if (value === "working") return "孩子可能结婚或购房，给钱的方式会决定这笔钱属于谁。";
    if (value === "married") return "孩子的小家庭可能进入育儿或换房阶段，你的支持方式要区分赠与、借款和定向安排。";
    if (value === "none") return "孩子可能进入幼儿园或小学，教育支出开始变得刚性。";
    return "子女教育或婚育的中期节点本次未提供。";
  }
  if (value === "school") return "孩子可能已完成学业、进入工作或婚恋阶段，你给钱的时间窗口会变窄。";
  if (value === "working") return "孩子可能已有下一代，教育、住房和照护会形成新的家庭支出。";
  if (value === "married") return "孙辈可能进入教育阶段，隔代支持要先分清给谁、谁管。";
  if (value === "none") return "孩子可能进入中学或大学，教育金和你的养老准备会同时到来。";
  return "子女的长期节点本次未提供，10 年内的教育和婚育安排无法展开。";
}

function parentTimeline(value: string | null, years: 3 | 5 | 10): string {
  if (value === "financial") {
    if (years === 3) return "父母需要经济支持，赡养支出会持续占用家庭现金流。";
    if (years === 5) return "父母赡养可能进入高频期，最好单独留一笔年度预算。";
    return "父母的养老和医疗支出会与你的退休准备重叠，需要提前分工。";
  }
  if (value === "care") {
    if (years === 3) return "父母需要日常照护，照护人力和费用要提前排。";
    if (years === 5) return "照护可能从偶尔帮忙变成长期安排，兄弟姐妹之间的分工要写清。";
    return "长期照护会消耗现金和精力，需要预留专项预算和替代方案。";
  }
  if (value === "healthy") {
    if (years === 3) return "父母目前身体尚可，但一次大病的自付费用仍可能打乱现金流。";
    if (years === 5) return "父母年龄继续上升，5 年内出现阶段性照护需求的概率会增加。";
    return "父母的养老、医疗和继承安排会集中出现，兄弟姐妹之间的分工最好提前说清。";
  }
  return "父母是否需要照顾本次未提供。";
}

function siblingTimeline(value: string | null, years: 3 | 5 | 10): string {
  if (years !== 10) return "";
  if (value === "conflict") return "兄弟姐妹之间有分歧，父母遗产分配和照护责任如果没有书面安排，10 年内更容易激化。";
  if (value === "harmony") return "兄弟姐妹关系正常，但代位继承和父母遗产分配仍建议提前沟通。";
  if (value === "only_child") return "作为独生子女，父母的养老、医疗和继承责任更集中在你身上。";
  return "兄弟姐妹情况本次未提供，父母遗产的分配路径无法判断。";
}

function businessTimeline(value: string | null, years: 3 | 5 | 10): string {
  if (value === "self" || value === "family") {
    if (years === 3) return "企业或持股经营会让家庭资产与企业债务的边界成为这 3 年的重点。";
    if (years === 5) return "企业可能面临接班、扩张或一轮债务到期，股权和控制权安排要提前想。";
    return "企业如果还没有接班或退出方案，10 年内一次意外就可能让股权、控制权和家庭资产同时暴露。";
  }
  if (value === "passive") {
    if (years === 3) return "家里有股权但未参与经营，分红、股权价值和转让限制仍需了解。";
    if (years === 5) return "股权可能涉及分红、转让或继承，持有人和受益人要分清。";
    return "股权如果长期不梳理，转让、继承和债务风险会在 10 年内叠加。";
  }
  return "";
}

function marriageTimeline(value: string | null, years: 3 | 5 | 10): string {
  if (value === "remarried") {
    if (years === 3) return "再婚家庭要同时处理前婚子女、现任配偶和各自财产的边界。";
    if (years === 5) return "子女逐渐成年，前婚与现任家庭的财产边界需要书面化。";
    return "再婚家庭的继承顺序和份额最容易在长期被忽略，遗嘱和受益人需要定期更新。";
  }
  if (value === "divorced") {
    if (years === 3) return "离异背景下，前婚子女的抚养、财产归属和未来继承要单独梳理。";
    if (years === 5) return "孩子可能进入婚恋或购房阶段，给钱时点和归属要提前说清。";
    return "前婚子女与现有家庭的继承关系，需要在文件中写清楚，而不是靠口头默契。";
  }
  if (value === "widowed") {
    if (years === 3) return "丧偶背景下，原有财产归属和继承文件需要重新核对。";
    if (years === 5) return "子女成家后，家庭财产边界和养老安排可能要重新调整。";
    return "丧偶家庭的继承和养老安排，建议在身体尚好时完成书面梳理。";
  }
  return "";
}

function buildFamilySection(answers: Answer[], profile: unknown): ReportSection {
  const members = labelOf(answers, "family_members");
  const children = valueOf(answers, "family_children");
  const parents = valueOf(answers, "family_parents");
  const siblings = valueOf(answers, "family_siblings");
  const marriage = valueOf(answers, "marriage_status");
  const business = valueOf(answers, "family_business");
  const profileText = profileFamily(profile);
  const missing: string[] = [];
  if (members === NOT_PROVIDED) missing.push("常住成员");
  if (!children) missing.push("子女情况");
  if (!parents) missing.push("父母照顾");
  if (!siblings) missing.push("兄弟姐妹");
  if (!marriage) missing.push("婚姻状态");
  if (!business) missing.push("企业经营");

  const first = [
    `本次家庭结构：${members}；${labelOf(answers, "family_children")}；${labelOf(answers, "family_parents")}；${labelOf(answers, "family_siblings")}；婚姻状态为${labelOf(answers, "marriage_status")}；${labelOf(answers, "family_business")}。`,
    profileText ? `你之前填写的家庭画像是：${profileText}。` : "",
    missing.length > 0
      ? `其中${missing.join("、")}没有提供，相关判断只能先空着，不能替你猜。`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const second = `未来 3 年：${childTimeline(children, 3)}${parentTimeline(parents, 3)}${businessTimeline(business, 3)}${marriageTimeline(marriage, 3)}这些不是预测，只是把已知节点放到时间轴上；哪一年用钱、需要谁签字，最好现在就标出来。`;

  const third = `未来 5 年：${childTimeline(children, 5)}${parentTimeline(parents, 5)}${businessTimeline(business, 5)}${marriageTimeline(marriage, 5)}如果几件事在同一年叠加，现金储备和保障额度要按最紧的那一年准备。`;

  const fourth = `未来 10 年：${childTimeline(children, 10)}${parentTimeline(parents, 10)}${siblingTimeline(siblings, 10)}${businessTimeline(business, 10)}${marriageTimeline(marriage, 10)}传承最怕“到时候再说”，因为继承、婚姻和债务的规则不会等你准备好。`;

  return {
    title: "一、家庭结构与未来时间轴",
    paragraphs: [first, second, third, fourth],
  };
}

/* -------------------------------------------------------------------------- */
/* 二、五大指数逐项解读                                                       */
/* -------------------------------------------------------------------------- */

function safetyComposition(input: IndexInput): string {
  const parts: string[] = [];
  if (typeof input.annualIncome === "number" && typeof input.annualExpense === "number" && input.annualIncome > 0) {
    const surplus = input.annualIncome - input.annualExpense;
    parts.push(`年结余 ${formatMoney(surplus)}（结余率 ${percent((surplus / input.annualIncome) * 100)}）`);
  }
  if (typeof input.totalAssets === "number" && input.totalAssets > 0 && typeof input.totalDebt === "number") {
    parts.push(`负债率 ${percent((input.totalDebt / input.totalAssets) * 100)}`);
  }
  if (typeof input.liquidAssets === "number" && typeof input.annualExpense === "number" && input.annualExpense > 0) {
    parts.push(`现金约覆盖 ${Math.round(input.liquidAssets / (input.annualExpense / 12))} 个月支出`);
  }
  if (typeof input.medicalCoverage === "number") parts.push(`医疗保额 ${formatMoney(input.medicalCoverage)}`);
  if (typeof input.criticalCoverage === "number") parts.push(`重疾保额 ${formatMoney(input.criticalCoverage)}`);
  if (typeof input.lifeCoverage === "number") parts.push(`寿险保额 ${formatMoney(input.lifeCoverage)}`);
  return parts.length > 0 ? `从组成项看，${parts.join("；")}。` : "本次收入、支出、资产和保额数据不完整，无法拆解组成项。";
}

function liquidityComposition(input: IndexInput): string {
  if (typeof input.liquidAssets !== "number" || typeof input.totalAssets !== "number" || input.totalAssets <= 0) {
    return "本次缺少流动资产或总资产数据，无法计算流动资产占比。";
  }
  return `流动资产 ${formatMoney(input.liquidAssets)}，总资产 ${formatMoney(input.totalAssets)}，流动资产占比 ${percent((input.liquidAssets / input.totalAssets) * 100)}。`;
}

function freedomComposition(input: IndexInput): string {
  if (typeof input.passiveIncome !== "number" || typeof input.annualExpense !== "number" || input.annualExpense <= 0) {
    return "本次缺少被动收入或年支出数据，无法计算覆盖比例。";
  }
  return `年被动收入 ${formatMoney(input.passiveIncome)}，年支出 ${formatMoney(input.annualExpense)}，覆盖比例 ${percent((input.passiveIncome / input.annualExpense) * 100)}。`;
}

function independenceComposition(input: IndexInput): string {
  const debt = derivedLifeDebt(input);
  if (typeof input.totalAssets !== "number" || debt === null) {
    return "本次缺少总资产或人生责任负债数据，无法计算覆盖比例。";
  }
  const basis =
    typeof input.lifeDebt === "number" && input.lifeDebt > 0
      ? "人生责任负债为你提供的数据"
      : "人生责任负债按年支出 25 倍加总负债估算";
  return `总资产 ${formatMoney(input.totalAssets)}，${basis} ${formatMoney(debt)}，覆盖比例 ${percent((input.totalAssets / debt) * 100)}。`;
}

function inheritanceComposition(input: IndexInput): string {
  if (
    typeof input.inheritanceAssets !== "number" ||
    typeof input.totalAssets !== "number" ||
    input.totalAssets <= 0
  ) {
    return "本次缺少已定向安排资产或总资产数据，无法计算占比。";
  }
  return `已定向安排资产 ${formatMoney(input.inheritanceAssets)}，总资产 ${formatMoney(input.totalAssets)}，占比 ${percent((input.inheritanceAssets / input.totalAssets) * 100)}。`;
}

function directionFor(name: WealthIndexScore["name"], index: WealthIndexScore | undefined): string {
  const score = index?.score ?? null;
  if (name === "安全指数") {
    if (score === null) return "先把年收入、年支出、总资产、总负债和三类保额补齐，否则安全指数只能空着。";
    if (score < 40) return "先补 3–6 个月应急金，再核对医疗、重疾、寿险保额，先把最短的那块板补上。";
    if (score < 80) return "先补最弱的一项，不要同时铺开。";
    return "保持应急金和保障额度，每年复核一次负债和家庭责任变化。";
  }
  if (name === "流动指数") {
    if (score === null) return "先补流动资产和总资产，再判断急用钱时能不能拿得出来。";
    if (score < 21) return "把新增结余的一部分放进可快速变现账户，并列出 3 个月内到期债务。";
    if (score < 51) return "把流动资产占比逐步抬到 40% 左右，避免所有钱都压在房产上。";
    return "保持流动资产的缓冲，同时把短期债务和信用额度也纳入季度检查。";
  }
  if (name === "自由指数") {
    if (score === null) return "先补被动收入和年支出，再谈退休后能不能不靠工资。";
    if (score < 50) return "先确认被动收入是否稳定，再把一部分长期储蓄转成能持续产生现金流的资产。";
    if (score < 100) return "把被动收入覆盖比例往上抬，优先补充退休后必须发生的医疗和照护支出。";
    return "保持被动收入来源分散，避免单一房租或单一分红中断。";
  }
  if (name === "独立指数") {
    if (score === null) return "先补总资产和人生责任负债，尤其是房贷、教育、赡养和养老四项。";
    if (score < 60) return "先算清未来 10 年必须花的钱，再决定先还高息负债还是先积累生息资产。";
    if (score < 100) return "按年度复盘责任进度，优先处理会中断现金流的风险。";
    return "资产已覆盖当前责任，下一步是防止婚姻、债务或企业风险把进度打回去。";
  }
  if (score === null) return "先补已定向安排资产和总资产，再判断传承缺口。";
  if (score < 20) return "先从一个最在意的场景开始，把受益人、遗嘱或信托中的一项真正落到文件。";
  if (score < 50) return "把传承性资产的覆盖面扩大，但先确认给谁、谁管、怎么给。";
  return "保持文件更新，家庭结构、婚姻或债务变化时及时调整受益人。";
}

function buildIndicesSection(indices: WealthIndexScore[], input: IndexInput): ReportSection {
  const names: Array<WealthIndexScore["name"]> = ["安全指数", "流动指数", "自由指数", "独立指数", "传承指数"];
  const compositions: Record<string, string> = {
    安全指数: safetyComposition(input),
    流动指数: liquidityComposition(input),
    自由指数: freedomComposition(input),
    独立指数: independenceComposition(input),
    传承指数: inheritanceComposition(input),
  };
  const paragraphs = names.map((name) => {
    const index = indexOf(indices, name);
    return `${name}：${scoreLine(index)}。${INDEX_MEANING[name]}${compositions[name]}改善方向：${directionFor(name, index)}`;
  });
  return {
    title: "二、五大指数逐项解读",
    paragraphs,
  };
}

/* -------------------------------------------------------------------------- */
/* 三、风险背后的机制                                                         */
/* -------------------------------------------------------------------------- */

interface RiskSupport {
  mechanism: string;
  checks: [string, string, string];
  snippetId: string;
}

function riskSupport(title: string): RiskSupport {
  if (/兄弟姐妹/.test(title)) {
    return {
      mechanism:
        "父母遗产先由第一顺序继承人分配；兄弟姐妹先于父母去世时，其子女可以代位继承，份额和参与分配的人数都会变化。",
      checks: ["父母财产目前登记在谁名下？", "兄弟姐妹中是否有人已去世或可能先走？", "父母有没有书面遗嘱或受益安排？"],
      snippetId: "civil-code-1127-1128",
    };
  }
  if (/家企|企业债务|担保|企业接班/.test(title)) {
    return {
      mechanism:
        "个人担保、家企资金混用和连带责任会让企业风险穿透到家庭资产；债务形成后再转移资产，可能被撤销或认定无效。",
      checks: ["企业贷款你个人签了什么担保？", "家庭账户和企业账户有没有混用？", "如果企业停止分红，家庭能撑多久？"],
      snippetId: "family-business-isolation",
    };
  }
  if (/婚姻|配偶债务/.test(title)) {
    return {
      mechanism:
        "婚后所得原则上属于夫妻共同财产，债务是否共同要看签字、用途和追认；没有书面约定时，边界主要靠出资和流水证据。",
      checks: ["婚前和婚内资产来源、登记能否说清？", "配偶的债务你签过字或追认过吗？", "给孩子的钱有没有书面说明只归孩子？"],
      snippetId: "marriage-property-1062-1063",
    };
  }
  if (/保单角色|理赔金|受益人/.test(title)) {
    return {
      mechanism:
        "投保人、被保险人、受益人三个角色决定谁交钱、谁被保障、谁拿钱；写错可能给不到想给的人。",
      checks: ["每张保单的受益人具体写的是谁？", "受益人写的是姓名还是“法定”？", "投保人如果先走，这张保单归谁？"],
      snippetId: "insurance-law-39-42",
    };
  }
  if (/保障|大病|医疗|重疾/.test(title)) {
    return {
      mechanism:
        "社保只覆盖目录内一部分，大病治疗、康复和收入中断会同时发生；保障不够时只能动长期储蓄。",
      checks: ["家里目前能报销大病的额度大概是多少？", "主要收入的人停薪 6 个月，家庭支出靠什么？", "现有保单的保额、免赔额和受益人都核对过吗？"],
      snippetId: "index-safety",
    };
  }
  if (/教育金/.test(title)) {
    return {
      mechanism:
        "教育支出有明确时间点，临时从家庭现金流或投资中抽调，会同时挤压养老、应急金和其他目标。",
      checks: ["目标教育阶段大概还要多少钱？", "这笔钱现在放在哪个账户？", "如果收入中断一年，教育金会不会被动用？"],
      snippetId: "index-independence",
    };
  }
  if (/收入稳定|应急金/.test(title)) {
    return {
      mechanism:
        "收入波动时，固定支出、房贷和保费会先变成压力；应急金不足，就只能借贷、退保或卖资产。",
      checks: ["家庭固定支出每月多少？", "现有现金能覆盖几个月？", "收入下降时哪笔支出可以暂停？"],
      snippetId: "index-liquidity",
    };
  }
  if (/养老/.test(title)) {
    return {
      mechanism:
        "社保只能覆盖基础生活，医疗、照护和品质养老的缺口需要额外现金流；长寿会让“钱够不够”变成“能撑多久”。",
      checks: ["退休后每月希望花多少？", "社保之外还有哪些稳定收入？", "这笔收入能持续多久？"],
      snippetId: "index-freedom",
    };
  }
  if (/传承指数/.test(title)) {
    return {
      mechanism:
        "传承性资产占比低，说明大部分财富仍走法定继承，定向性和给付节奏都弱，容易受婚姻、债务和家庭争议影响。",
      checks: ["哪些资产已经写了受益人或遗嘱？", "给孩子的钱想一次给还是分批给？", "如果孩子婚姻变化，这笔钱归谁？"],
      snippetId: "index-inheritance",
    };
  }
  if (/传承|分走|给孩子的钱|时点|工具缺位/.test(title)) {
    return {
      mechanism:
        "没有指定受益人或遗嘱时，财产按法定继承；孩子婚变、债务或纠纷都可能改变钱最终归谁。",
      checks: ["这笔钱现在写在谁名下？", "受益人、遗嘱写的是谁，份额清楚吗？", "如果孩子明天离婚，这笔钱的法律属性是什么？"],
      snippetId: "insurance-law-39-42",
    };
  }
  return {
    mechanism:
      "家庭资产和责任的期限不匹配：短期要用的钱被锁在长期资产里，长期责任又没有稳定的现金流承接。",
    checks: ["这项风险对应的最坏情况是什么？", "发生后第一笔钱从哪里来？", "现在能做的第一步是什么？"],
    snippetId: "index-safety",
  };
}

function buildRiskSection(risks: RiskItem[]): ReportSection {
  if (risks.length === 0) {
    return {
      title: "三、风险背后的机制",
      paragraphs: [
        "本次规则库没有触发明确的高风险条目，但这不等于没有风险，只说明你提供的信息还没有落到具体风险规则上。家庭风险往往不是“有没有”的问题，而是金额、时间、归属和决策人没有对齐。",
        "你可以先用 66 问的四组场景自查：婚姻、传承、税务、债务与执行。每一组只问三个事实：钱在谁名下、谁有权决定、如果明天发生变故谁会参与分配。把这三问答清楚，比先选工具更重要。",
      ],
    };
  }

  const top = risks.slice(0, 5);
  const paragraphs = top.map((risk) => {
    const support = riskSupport(risk.title);
    const checks = support.checks.map((question, index) => `${index + 1}）${question}`).join(" ");
    return `「${risk.title}」机制上，${support.mechanism} 否则，${safeRiskText(risk.ifIgnored)} 自查三问：${checks}（依据：${citationLabel(support.snippetId)}）`;
  });

  if (risks.length > 5) {
    const rest = risks.slice(5).map((risk) => `「${risk.title}」`).join("、");
    paragraphs[paragraphs.length - 1] += ` 另外，${rest} 也需要在下次面谈时逐条核对。`;
  } else if (paragraphs.length < 2) {
    paragraphs.push(
      "这条风险不是孤立的：它通常会和现金流、家庭结构或文件安排连在一起。下一步把这条风险对应的金额、时间和决策人写下来，再看它会不会通过婚姻、债务或继承链条影响其他人。",
    );
  }

  return {
    title: "三、风险背后的机制",
    paragraphs,
  };
}

/* -------------------------------------------------------------------------- */
/* 四、分场景推演                                                             */
/* -------------------------------------------------------------------------- */

interface Scenario {
  key: string;
  title: string;
  score: number;
  paragraphs: [string, string];
}

function buildScenarios(answers: Answer[]): Scenario[] {
  const scenarios: Scenario[] = [];
  const children = valueOf(answers, "family_children");
  const medical = labelOf(answers, "protection_medical");
  const critical = labelOf(answers, "protection_critical");
  const life = labelOf(answers, "protection_life");
  const runway = labelOf(answers, "protection_runway");
  const healthRelevant =
    hasAny(answers, "protection_medical", ["social_only", "unknown"]) ||
    hasAny(answers, "protection_critical", ["none", "under30", "unknown"]) ||
    hasAny(answers, "protection_life", ["none", "accident_only", "unknown"]) ||
    hasAny(answers, "health_conditions", ["controlled", "treating"]);

  if (healthRelevant) {
    scenarios.push({
      key: "health",
      title: "健康与医疗",
      score: 100,
      paragraphs: [
        `现在：医疗方面是${medical}，重疾方面是${critical}，寿险和意外方面是${life}，应急金是${runway}。如果发生：一次大病会带来治疗、康复和收入中断三笔账，社保报销有目录和比例限制，自费药、护工和异地就医可能不在报销范围内。`,
        "结果：家庭可能先动应急金，再卖流动性资产，最后影响孩子教育和养老；如果主要收入的人倒下，房贷和固定支出不会暂停。可提前核对社保、医疗险和重疾险的保额与免赔额，算清家庭自付上限。",
      ],
    });
  }

  const inheritanceRelevant =
    hasAny(answers, "family_children", ["married", "working"]) ||
    valueOf(answers, "inheritance_intent") !== null ||
    valueOf(answers, "inheritance_tools") !== null ||
    valueOf(answers, "inheritance_when") !== null ||
    hasAny(answers, "family_siblings", ["harmony", "conflict"]) ||
    valueOf(answers, "assets_inheritance") !== null;

  if (inheritanceRelevant) {
    scenarios.push({
      key: "inheritance",
      title: "传承与继承",
      score: 95,
      paragraphs: [
        `现在：子女情况是${labelOf(answers, "family_children")}，传承工具是${labelOf(answers, "inheritance_tools")}，给钱时点是${labelOf(answers, "inheritance_when")}，最担心的是${labelOf(answers, "inheritance_worry")}。如果发生：没有遗嘱或明确受益人时，财产按法定继承，第一顺序是配偶、子女、父母；孩子已婚时，继承所得原则上可能成为夫妻共同财产，除非遗嘱或赠与明确只归一方。`,
        "结果：你想给孩子的钱可能被分走、被债务追及或在家人之间产生争议；如果兄弟姐妹先于父母去世，还会发生代位继承。提前把家庭结构图、资产清单和给钱时点写清，再决定用受益人、遗嘱还是信托。",
      ],
    });
  }

  const businessRelevant =
    hasAny(answers, "family_business", ["self", "family", "passive"]) ||
    hasAny(answers, "business_ownership", ["self", "family", "passive"]) ||
    hasAny(answers, "business_guarantee", ["yes", "unknown"]) ||
    valueOf(answers, "business_debt") !== null;

  if (businessRelevant) {
    scenarios.push({
      key: "business",
      title: "家企与经营",
      score: 90,
      paragraphs: [
        `现在：企业经营情况是${labelOf(answers, "family_business")}，个人或家庭担保是${labelOf(answers, "business_guarantee")}，企业负债是${labelOf(answers, "business_debt")}，接班安排是${labelOf(answers, "business_succession")}。如果发生：企业现金流下降、贷款到期或个人担保被追偿，家庭资产可能被牵连；家企资金混用会让边界更难证明。`,
        "结果：家庭生活费、房贷、孩子教育和养老可能同时受影响；可提前做的是画企业图和家庭图，列清个人担保、关联借款和家庭固定支出，再谈合法合规的隔离安排。",
      ],
    });
  }

  const marriageRelevant =
    hasAny(answers, "marriage_status", ["remarried", "divorced", "widowed"]) ||
    hasAny(answers, "marriage_assets", ["no", "unknown"]) ||
    hasAny(answers, "marriage_spouse_debt", ["yes", "unknown"]) ||
    hasAny(answers, "family_children", ["married"]);

  if (marriageRelevant) {
    scenarios.push({
      key: "marriage",
      title: "婚姻与财产归属",
      score: 85,
      paragraphs: [
        `现在：婚姻状态是${labelOf(answers, "marriage_status")}，婚前或婚内财产约定是${labelOf(answers, "marriage_assets")}，配偶债务情况是${labelOf(answers, "marriage_spouse_debt")}。如果发生：婚姻变动时，婚后所得原则上共同，婚前财产、明确只归一方的遗嘱或赠与属于个人；债务是否共同要看签字、用途和追认。`,
        "结果：资产混同会让边界说不清，给孩子的钱也可能被重新分配；可提前做的是保留出资和保费来源凭证，必要时做书面约定，并让受益人、遗嘱的表述和真实意愿一致。",
      ],
    });
  }

  const educationRelevant =
    hasAny(answers, "education_plan", ["domestic", "abroad", "undecided"]) ||
    valueOf(answers, "education_budget") !== null ||
    valueOf(answers, "education_stage") !== null;

  if (educationRelevant) {
    scenarios.push({
      key: "education",
      title: "教育与子女",
      score: 80,
      paragraphs: [
        `现在：孩子处于${labelOf(answers, "education_stage")}阶段，教育计划是${labelOf(answers, "education_plan")}，教育金准备是${labelOf(answers, "education_budget")}。如果发生：教育支出有明确时间点，留学或国内大额教育通常需要提前几年准备，临时从家庭现金流抽调会挤压其他目标。`,
        "结果：可能被迫动用养老储蓄、卖资产或减少教育选择；可提前做的是估算目标阶段费用和时间，单独规划一笔教育金，并确认这笔钱在家庭风险发生时不会被先动用。",
      ],
    });
  }

  const retirementRelevant =
    valueOf(answers, "retirement_age") !== null ||
    valueOf(answers, "retirement_income") !== null ||
    valueOf(answers, "retirement_cashflow") !== null;

  if (retirementRelevant) {
    scenarios.push({
      key: "retirement",
      title: "养老与长期现金流",
      score: 75,
      paragraphs: [
        `现在：退休预期是${labelOf(answers, "retirement_age")}，退休后主要收入是${labelOf(answers, "retirement_income")}，希望每月现金流是${labelOf(answers, "retirement_cashflow")}。如果发生：退休后收入从工资切换为社保、储蓄和被动收入，医疗和照护支出反而上升。`,
        "结果：可能被迫降低生活水平、依赖子女或动用长期储蓄；可提前做的是估算退休后每月支出，列出社保之外的稳定现金流，并留出医疗照护专项。",
      ],
    });
  }

  return scenarios.sort((a, b) => b.score - a.score);
}

function buildScenarioSection(answers: Answer[]): ReportSection {
  const scenarios = buildScenarios(answers).slice(0, 2);
  if (scenarios.length === 0) {
    return {
      title: "四、分场景推演",
      paragraphs: [
        "本次没有提供足够的健康、传承、婚姻、家企、教育或养老信息，暂时无法判断哪个场景与你最相关。为了避免编故事，这里不替你假设具体剧情。",
        "下次可以只补三类信息：家庭成员和年龄、家庭主要资产和负债、你最担心的一件事。有了这三类信息，场景推演才能落到“现在—如果发生—结果”的具体路径上。",
      ],
    };
  }

  const paragraphs: string[] = [];
  for (const scenario of scenarios) {
    paragraphs.push(`【${scenario.title}】${scenario.paragraphs[0]}`);
    paragraphs.push(scenario.paragraphs[1]);
  }
  paragraphs.push(
    "排优先级：先看发生概率高、对现金流冲击大的那一个，再看它会通过婚姻、债务还是继承影响别人。先选一个最紧的，把金额、时间、决策人写清楚。",
  );
  return {
    title: "四、分场景推演",
    paragraphs,
  };
}

/* -------------------------------------------------------------------------- */
/* 五、传承架构                                                               */
/* -------------------------------------------------------------------------- */

function buildInheritanceSection(answers: Answer[]): ReportSection {
  const children = labelOf(answers, "family_children");
  const tools = labelOf(answers, "inheritance_tools");
  const when = labelOf(answers, "inheritance_when");
  const control = labelOf(answers, "inheritance_control");
  const worry = labelOf(answers, "inheritance_worry");

  const p1 = `先回答三个问题：给谁、谁管、怎么给。本次子女情况是${children}，工具是${tools}，给钱时点是${when}，控制权是${control}，最担心的是${worry}。信息缺失就先补事实，顺序是先归属、再控制、最后谈节奏。`;

  const p2 =
    "遗嘱适合意愿明确、资产简单、家人能配合的场景：合法有效的遗嘱优先于法定继承（《民法典》第一千一百二十三条），但只管意愿不管过户，房产等通常要继承权公证书或法院文书，还要为缺乏劳动能力又没有生活来源的继承人保留必要份额。保单受益人的优势是理赔金可直接给到指定的人：保险法第三十九条规定受益人由被保险人或投保人指定，投保人指定须经被保险人同意；第四十二条规定，只有未指定、指定不明、受益人先走且无其他受益人，或受益人丧失、放弃受益权且无其他受益人时，保险金才作为遗产。局限是主要解决身故保险金，现金价值可能受债务影响，受益人拿到钱后也可能混同。";

  const p3 =
    "保险金信托适合担心理赔金一次性给到孩子后守不住的场景：常见做法是把保单受益人变更为信托，理赔后保险金进入信托，再由受托人按约定时间、条件、金额分配。它的优点是能把“给谁”延伸到“怎么给”；局限是主要承接保险金，保单现金价值、投保人债务仍要单独处理，还需要保险与信托机构配合。家族信托装得更多，可纳入现金、保单权益、股权、房产，适合结构复杂、资产类型多的家庭；但门槛和持续成本更高，对资产来源、设立时机和控制权要求更严，信托财产独立性也不是绝对的。";

  const p4 =
    "怎么选：金额有限、结构简单、只要求确定给到孩子的，先写清受益人，再用遗嘱补漏；孩子年幼、婚姻复杂、担心理赔金被挥霍的，再考虑保险金信托；资产类型多、涉及股权房产、需要长期分配规则的，才讨论家族信托。本报告不点名任何产品或机构，也不构成法律意见，具体文件请专业人士核对。";

  return {
    title: "五、传承架构：给谁、谁管、怎么给",
    paragraphs: [p1, p2, p3, p4],
  };
}

/* -------------------------------------------------------------------------- */
/* 六、家企隔离与婚姻财产（条件性）                                           */
/* -------------------------------------------------------------------------- */

function buildBusinessMarriageSection(answers: Answer[]): ReportSection | null {
  const businessRelevant =
    hasAny(answers, "family_business", ["self", "family", "passive"]) ||
    hasAny(answers, "business_ownership", ["self", "family", "passive"]) ||
    hasAny(answers, "business_guarantee", ["yes", "unknown"]) ||
    valueOf(answers, "business_debt") !== null;
  const marriageRelevant =
    hasAny(answers, "marriage_status", ["remarried", "divorced", "widowed"]) ||
    hasAny(answers, "marriage_assets", ["no", "unknown"]) ||
    hasAny(answers, "marriage_spouse_debt", ["yes", "unknown"]) ||
    hasAny(answers, "family_children", ["married"]);

  if (!businessRelevant && !marriageRelevant) return null;

  const paragraphs: string[] = [];

  if (businessRelevant) {
    paragraphs.push(
      `家企隔离：本次显示${labelOf(answers, "family_business")}，个人或家庭担保是${labelOf(answers, "business_guarantee")}，企业负债是${labelOf(answers, "business_debt")}。机制上，个人担保、家企混用和连带责任会让企业风险穿透到家庭资产，债务形成后再转移资产可能被撤销。先画企业图和家庭图，列清个人担保、关联借款和家庭固定支出，再算“企业停分红后家庭能撑多久”；涉及治理、担保和税务的安排，交给专业人士确认。`,
    );
  }

  if (marriageRelevant) {
    paragraphs.push(
      `婚姻财产：本次显示婚姻状态为${labelOf(answers, "marriage_status")}，财产约定为${labelOf(answers, "marriage_assets")}，配偶债务为${labelOf(answers, "marriage_spouse_debt")}。机制上，婚后所得原则上共同，婚前财产、明确只归一方的遗嘱或赠与属于个人；债务是否共同看签字、用途和追认。先保留出资、保费来源和还贷流水，把给孩子的钱写成书面说明，再用家庭结构图标清每个人和每笔钱的边界；是否需要书面约定，由律师判断。${businessRelevant ? "企业和婚姻两条线同时存在时，先写清谁签字、谁担保、谁持股、谁是保单受益人。" : ""}`,
    );
  }

  if (paragraphs.length < 2) {
    paragraphs.push(
      "边界不是一次做完：每年家庭会议复盘一次，人员、债务、股权、婚姻变化时更新文件。不要把“隔离”理解成某一个工具，先看责任、现金流和证据，再决定要不要动结构。",
    );
  }

  return {
    title: "六、家企隔离与婚姻财产",
    paragraphs,
  };
}

/* -------------------------------------------------------------------------- */
/* 七、90 天行动清单                                                          */
/* -------------------------------------------------------------------------- */

function buildActionSection(risks: RiskItem[]): ReportSection {
  const focus = risks.length > 0 ? `「${risks[0].title}」` : "家庭基础风险";
  return {
    title: "七、90 天行动清单",
    paragraphs: [
      `第 1–2 周：先做保单盘点，重点看${focus}。材料：所有保险合同、投保单、最近一次缴费记录、身份证、户口本、结婚证。要问：每张保单的投保人、被保险人、受益人分别是谁？受益人写的是姓名还是“法定”？保费从哪个账户出，属于个人财产还是夫妻共同财产？`,
      "第 3–4 周：画家庭结构图和资产清单。材料：房产证或购房合同、银行卡和理财对账单、贷款合同、对外担保合同、企业营业执照和最近一年经营报表、父母和子女的基本情况。要问：哪些资产是婚前或个人财产？哪些债务有个人担保？如果明天收入中断，第一笔钱从哪里来？图不用漂亮，但要能看出谁依赖谁。",
      "第 2 个月：补现金流和保障缺口。材料：近 6 个月流水、社保记录、体检报告、现有保单责任页。要问：应急金够不够 6 个月固定支出？医疗、重疾、寿险的保额和免赔额是否清楚？教育金、养老金是否单独放？先补最影响现金流的一项，不急着做购买决定。",
      "第 3 个月：把安排落到文件，并做一次复盘。材料：本报告、家庭结构图、资产清单、保单清单、问题清单。要问：给谁、谁管、怎么给有没有答案？哪些安排需要书面化，哪些需要律师或税务师确认？把下次诊断要问的问题提前写下来。",
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* 八、下次一对一诊断要带什么                                                 */
/* -------------------------------------------------------------------------- */

function buildPreparationSection(): ReportSection {
  return {
    title: "八、下次一对一诊断要带什么",
    paragraphs: [
      "证件和家庭关系材料：身份证、户口本、结婚证或离婚证、子女出生证明、父母的基本情况和照护安排。如果家庭结构复杂，提前画一张家庭结构图，标出婚姻、子女、父母、兄弟姐妹和企业持股关系。",
      "保单和资产材料：所有保险合同和最近一次缴费记录、银行卡和理财对账单、房产证或购房合同、股权或合伙协议、贷款合同、对外担保合同、企业最近一年报表。重点是把“谁名下、多少钱、欠多少、谁签字”说清。",
      "问题清单：写下最想解决的三件事，按“今年、3 年内、10 年内”排序；再写下给钱时点、谁参与决策、能否接受书面约定或信托。诊断不是听推荐，而是把真实约束摆上桌面，再决定下一步做什么。",
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* 九、预算区间与免责声明                                                     */
/* -------------------------------------------------------------------------- */

function buildBudgetSection(input: IndexInput): ReportSection {
  const income = input.annualIncome;
  const expense = input.annualExpense;
  let first: string;
  if (typeof income === "number" && typeof expense === "number" && income > 0) {
    const surplus = Math.max(0, income - expense);
    const min = Math.round((surplus * 0.1) / 1000) * 1000;
    const max = Math.round((surplus * 0.2) / 1000) * 1000;
    const budgetLine =
      surplus > 0
        ? `按结余的 10%–20% 做规划预算，参考区间是 ${formatMoney(min)}–${formatMoney(max)}/年`
        : "年支出不低于年收入，结余为 0 或为负，当前不适合先划长期预算";
    first = `你填写的家庭年收入是 ${formatMoney(income)}，年支出是 ${formatMoney(expense)}，年结余是 ${formatMoney(income - expense)}。${budgetLine}。这个区间是保障与长期目标的规划上限，不是保费报价，也不对应任何产品。`;
  } else {
    first =
      "本次年收入或年支出没有提供完整，无法给出预算区间。预算不是拍脑袋的数字，通常要先用家庭年结余、固定支出和未来 3 年目标倒推；下次补上这两个数字，预算才有参考意义。";
  }

  const second =
    "预算的使用顺序建议是：先补 3–6 个月应急金，再补会中断家庭现金流的保障缺口，最后才安排教育、养老和传承等长期目标。结余为负先修复现金流；结余有限就先把一项做扎实，不摊薄到每个目标。";

  const third = `${REPORT_DISCLAIMER} 报告中的分数、预算和场景推演都基于你本次填写的信息；信息变化后，结论需要重新核对。`;

  return {
    title: "九、预算区间与免责声明",
    paragraphs: [first, second, third],
  };
}

/* -------------------------------------------------------------------------- */
/* 入口                                                                       */
/* -------------------------------------------------------------------------- */

export function buildReportSections(params: BuildReportSectionsParams): ReportSection[] {
  const { answers, indices, risks, input, profile } = params;
  const sections: ReportSection[] = [
    buildFamilySection(answers, profile),
    buildIndicesSection(indices, input),
    buildRiskSection(risks),
    buildScenarioSection(answers),
    buildInheritanceSection(answers),
  ];
  const businessMarriage = buildBusinessMarriageSection(answers);
  if (businessMarriage) sections.push(businessMarriage);
  sections.push(buildActionSection(risks), buildPreparationSection(), buildBudgetSection(input));
  sections.push(buildDecisionSection(answers, risks, indices, input));
  return sections;
}


/* -------------------------------------------------------------------------- */
/* PAS 决策收口：Problem → Education（把后果讲透）→ Solution                 */
/* -------------------------------------------------------------------------- */

function openingWords(answers: Answer[]): string {
  return (answers.find((answer) => answer.questionId === "opening")?.freeText || "").trim().slice(0, 100);
}

function lowestIndex(indices: WealthIndexScore[]): WealthIndexScore | null {
  const scored = indices.filter((item) => item.score !== null);
  if (scored.length === 0) return null;
  return [...scored].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0];
}

function mechanismFor(risk: RiskItem | null, index: WealthIndexScore | null): string {
  const text = `${risk?.title ?? ""} ${risk?.sourceRefs.join(" ") ?? ""} ${index?.name ?? ""}`;
  if (/传承|继承|受益|给钱|孩子/.test(text)) {
    const a = getKnowledgeSnippet("civil-code-1127-1128")?.body || "";
    const b = getKnowledgeSnippet("insurance-law-39-42")?.body || "";
    return [a, b].filter(Boolean).join(" ");
  }
  if (/家企|企业|担保|债务/.test(text)) {
    return [getKnowledgeSnippet("family-business-isolation")?.body, getKnowledgeSnippet("marriage-debt-1064")?.body].filter(Boolean).join(" ");
  }
  if (/婚姻|婚前|婚内|配偶/.test(text)) {
    return [getKnowledgeSnippet("marriage-property-1062-1063")?.body, getKnowledgeSnippet("marriage-debt-1064")?.body].filter(Boolean).join(" ");
  }
  if (/安全|保障|医疗|重疾|意外|应急/.test(text)) {
    return getKnowledgeSnippet("index-safety")?.body || "";
  }
  if (/流动/.test(text)) return getKnowledgeSnippet("index-liquidity")?.body || "";
  if (/自由|养老|退休/.test(text)) return getKnowledgeSnippet("index-freedom")?.body || "";
  if (/独立|教育/.test(text)) return getKnowledgeSnippet("index-independence")?.body || "";
  return getKnowledgeSnippet("risk-66")?.body || "";
}

function decisionFocus(risk: RiskItem | null): string {
  if (!risk) return "把已经看清的安排落到文件上";
  if (/保障|医疗|重疾|安全|应急/.test(risk.title)) return "先把家庭保障缺口补到能承受一场大病和 6–12 个月收入中断";
  if (/传承|继承/.test(risk.title)) return "先把「给谁、谁管、怎么给」和受益人/遗嘱写清楚";
  if (/家企|企业|债务/.test(risk.title)) return "先把个人担保、企业负债和家庭资产边界盘清楚";
  if (/婚姻/.test(risk.title)) return "先把婚前/婚内财产边界和配偶债务确认清楚";
  if (/教育/.test(risk.title)) return "先把孩子教育金的时间表和缺口算清楚";
  if (/养老|退休/.test(risk.title)) return "先把退休后的现金流缺口和补充来源算清楚";
  return "先处理这份报告里排在最前面的那一个风险";
}

function stripDisclaimer(text: string): string {
  return text.replace(/以上为风险自查参考.*$/u, "").trim();
}

/** PAS 的 P 要选“客户最在意 + 风险最高”的那一个，而不是机械按风险排序取第一条。 */
function pickMainRisk(answers: Answer[], risks: RiskItem[]): RiskItem | null {
  if (risks.length === 0) return null;
  const opening = answers.find((answer) => answer.questionId === "opening")?.freeText || "";
  const field = (id: string) => answers.find((answer) => answer.questionId === id)?.value;
  const find = (pattern: RegExp) => risks.find((risk) => pattern.test(risk.title)) ?? null;

  if (/(企业|公司|生意|工厂|担保|家企|债务|贷款)/.test(opening)) {
    const business = find(/家企|企业|债务/);
    if (business) return business;
  }
  if (/(传承|继承|孩子.*结婚|儿子.*结婚|女儿.*结婚|婚姻|给孩子的钱)/.test(opening)) {
    const inheritance = find(/传承|婚姻/);
    if (inheritance) return inheritance;
  }
  if (/(生病|大病|医疗|健康|住院|手术)/.test(opening)) {
    const protection = find(/保障|医疗|重疾/);
    if (protection) return protection;
  }
  if (/(退休|养老|养老金)/.test(opening)) {
    const retirement = find(/养老|退休/);
    if (retirement) return retirement;
  }
  if (/(教育|留学|上学|出国)/.test(opening)) {
    const education = find(/教育/);
    if (education) return education;
  }
  if (["self", "family"].includes(field("family_business") ?? "")) {
    const business = find(/家企|企业|债务/);
    if (business) return business;
  }
  if (field("family_children") === "married") {
    const inheritance = find(/传承|婚姻/);
    if (inheritance) return inheritance;
  }
  return risks[0];
}

export function buildDecisionTeaser(
  answers: Answer[],
  risks: RiskItem[],
  indices: WealthIndexScore[],
): { problem: string; consequence: string; nextStep: string } {
  const risk = pickMainRisk(answers, risks);
  const index = lowestIndex(indices);
  const problem = risk
    ? `${risk.title}。${risk.phenomenon}`
    : index
      ? `本次最接近底线的是${index.name}（${index.score} 分），家庭目前没有明显高风险，但安排还没有完全落到文件。`
      : "本次没有发现明显高风险项，但家庭阶段变化时，现有安排仍需要复核。";
  const consequence = risk
    ? `${risk.whyItMatters}${stripDisclaimer(risk.ifIgnored)}`
    : "家庭阶段变化（孩子结婚、父母年老、企业波动）会让今天的平衡被打破；没有文件安排时，最终按法定规则走，未必符合你的真实意愿。";
  return {
    problem,
    consequence,
    nextStep: decisionFocus(risk),
  };
}

function buildDecisionSection(
  answers: Answer[],
  risks: RiskItem[],
  indices: WealthIndexScore[],
  input: IndexInput,
): ReportSection {
  const risk = pickMainRisk(answers, risks);
  const index = lowestIndex(indices);
  const teaser = buildDecisionTeaser(answers, risks, indices);
  const words = openingWords(answers);
  const mechanism = mechanismFor(risk, index);
  const sections: string[] = [];

  // P：用客户自己的话 + 报告里最靠前的问题，把问题钉死
  const p1 = words
    ? `P（Problem）：你最开始说：「${words}」。这句话对应的，就是报告里排在最前面的问题——${teaser.problem}`
    : `P（Problem）：这份报告里排在最前面的问题——${teaser.problem}`;
  sections.push(p1);

  // A：不是吓客户，而是把规则、时间和家庭代价讲清楚（PAS 的 A=Education）
  const a1 = `A（Education，把后果讲透，不是制造恐慌）：${teaser.consequence}${mechanism ? ` 背后的机制不是“运气不好”，而是规则和现金流：${mechanism}` : ""}`;
  const a2 = risk
    ? `如果今天不处理，它不会停在这里：孩子结婚、父母年老、企业周转、收入波动，任何一个时间点都可能把这个问题放大。A 段不是制造焦虑，而是把“现在处理的成本”和“以后处理的成本”放在同一张桌上比较。`
    : `如果今天不复核，它不会自动变好：家庭结构、婚姻、企业、政策都会变，今天的“没问题”不等于三年后还没问题。A 段不是制造焦虑，而是把“现在复核的成本”和“以后被动处理的成本”放在同一张桌上比较。`;
  sections.push(a1, a2);

  // S：给一个能马上做的决定，而不是一堆产品
  const s1 = `S（Solution）：${decisionFocus(risk)}。${risk?.suggestedAction ?? "先把家庭结构、资产清单和现有保单受益人核对一遍，再决定先做哪一件。"}`;
  const s2 = `你现在不需要马上买任何产品。你只需要先做一个决定：接下来 30 天，先处理哪一件事？A. 先补保障缺口；B. 先理传承/受益人；C. 先做家企隔离；D. 先补应急金。按这份报告，我建议先选「${decisionFocus(risk)}」。下一步不是“再看看”，而是带着这份报告做一次 30 分钟一对一诊断：把今天的 P 和 A 摊开，把 S 拆成 30/60/90 天能执行的动作；具体产品、费率和合同条款线下核对，本报告不做推荐。`;
  sections.push(s1, s2);

  return {
    title: "决策收口：如果只做一件事（PAS）",
    paragraphs: sections,
  };
}
