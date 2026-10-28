import type { CheckupDimensionId, Question } from "./types";

function q(
  id: string,
  dimension: CheckupDimensionId,
  field: string,
  prompt: string,
  options: Array<[string, string]>,
  required = false,
  weight = 1,
  extra: Partial<Question> = {},
): Question {
  return {
    id,
    dimension,
    field,
    prompt,
    options: options.map(([value, label]) => ({ value, label })),
    allowFreeText: true,
    required,
    weight,
    ...extra,
  };
}

export const QUESTION_BANK: Question[] = [
  // ===== 家庭结构（必问，5 题）=====
  q("family_members", "family", "household", "家里现在常住的是哪几口人？", [
    ["couple", "夫妻两人"], ["children", "夫妻 + 孩子"], ["three_gen", "三代同堂"], ["other", "其他"],
  ], true, 3, {
    hint: "可以按实际住在一起的人说，不用写姓名。",
    example: "我和老婆，加一个上小学的儿子；父母在老家，偶尔来住。",
  }),
  q("family_children", "family", "children", "孩子多大了、结婚了吗？", [
    ["school", "还在上学"], ["working", "已工作未婚"], ["married", "已结婚"], ["none", "还没有孩子"],
  ], true, 3, {
    hint: "有几个孩子、大概年龄、是否结婚，都会影响传承和婚姻风险的判断。",
    example: "一个女儿 26 岁，刚结婚；一个儿子 18 岁，还在上学。",
  }),
  q("family_parents", "family", "parents", "父母那边需要你们照顾吗？", [
    ["healthy", "身体健康，不需要"], ["financial", "需要经济支持"], ["care", "需要日常照护"], ["other", "其他"],
  ], true, 2, {
    hint: "包括经济支持、日常照护，或者将来可能需要的医疗支出。",
    example: "父母都 70 多岁，身体还可以，但每年会给一些生活费。",
  }),
  q("family_siblings", "family", "siblings", "你有兄弟姐妹吗？父母将来的安排，你们聊过吗？", [
    ["only_child", "独生子女"], ["harmony", "有兄弟姐妹，关系正常"], ["conflict", "有兄弟姐妹，有分歧"], ["skip", "不想说"],
  ], true, 3, {
    hint: "兄弟姐妹会影响父母遗产的分配和继承顺序，尤其是兄弟姐妹先于父母去世时的代位继承。",
    example: "有一个哥哥，父母财产还没正式聊过；平时关系还可以。",
  }),
  q("family_business", "family", "businessInvolvement", "家里有人做生意或持股吗？", [
    ["none", "没有"], ["self", "有，本人经营"], ["family", "有，配偶或子女经营"], ["passive", "有，但未参与经营"],
  ], true, 2, {
    hint: "不一定要说公司名，只要说大概谁在经营、是否持股。",
    example: "我自己开了一家小公司，老婆不参与经营。",
  }),

  // ===== 已有保障（必问，5 题）=====
  q("protection_medical", "protection", "medicalInsurance", "现在有商业医疗险吗？", [
    ["million", "有，百万医疗"], ["mid_high", "有，中高端医疗"], ["social_only", "只有社保"], ["unknown", "不清楚"],
  ], true, 3, {
    hint: "不知道具体保额也没关系，选大概情况就行。",
    example: "只有社保，商业医疗险还没买。",
  }),
  q("protection_critical", "protection", "criticalIllness", "有重疾险吗？保额大概多少？", [
    ["none", "没有"], ["under30", "30 万以下"], ["30_50", "30–50 万"], ["over50", "50 万以上"], ["unknown", "不清楚"],
  ], true, 3, {
    hint: "保额不用精确，选区间即可；不确定可以选「不清楚」。",
    example: "有一份 30 万的重疾险，很多年前买的。",
  }),
  q("protection_life", "protection", "lifeInsurance", "家庭主要收入的人有寿险或意外险吗？", [
    ["both", "都有"], ["accident_only", "只有意外"], ["life_only", "只有寿险"], ["none", "都没有"], ["unknown", "不清楚"],
  ], true, 2, {
    hint: "重点看家里主要挣钱的人，万一收入中断，家庭能撑多久。",
    example: "我有意外险，寿险没有；老婆没有。",
  }),
  q("protection_runway", "protection", "emergencyRunway", "如果明天收入中断，家里能撑多久？", [
    ["under3", "3 个月以内"], ["3_6", "3–6 个月"], ["6_12", "6–12 个月"], ["over12", "1 年以上"], ["unknown", "说不清"],
  ], true, 3, {
    hint: "按现有存款和固定支出来估算，不用精确。",
    example: "房贷加生活费一个月 2 万，存款大概能撑 6 个月。",
  }),
  q("protection_policy_roles", "protection", "policyRoles", "你目前有哪些保单？投保人、被保险人、受益人分别是谁，你清楚吗？", [
    ["clear", "都清楚"], ["partial", "只知道一部分"], ["unknown", "不清楚"], ["none", "没有保单"], ["skip", "不想说"],
  ], false, 3, {
    open: true,
    hint: "投保人是交钱的人，被保险人是被保障的人，受益人是拿钱的人；这三个角色不同，结果差别很大。",
    example: "我有一份重疾险：投保人是我，被保险人是我，受益人写的是我老婆；医疗险不太清楚。",
  }),

  // ===== 传承（6 题）=====
  q("inheritance_intent", "inheritance", "inheritanceIntent", "家里的钱将来怎么给到孩子，认真想过吗？", [
    ["documented", "已经写进文件"], ["oral", "口头跟家人说过"], ["thought", "想过，但没安排"], ["never", "还没想过"], ["young", "孩子还小"],
  ], false, 3, {
    hint: "写进文件包括遗嘱、信托、保单受益人指定；口头说说不算法律安排。",
    example: "想过，但还没写遗嘱，也没做信托。",
  }),
  q("inheritance_children_marriage", "inheritance", "childrenMarriage", "孩子结婚时，你希望这笔钱是婚前给还是婚后给？", [
    ["before", "婚前给"], ["after", "婚后给"], ["depends", "看情况"], ["never", "没想过"],
  ], false, 2, {
    hint: "婚前给和婚后给，法律上归属可能不同；不用现在决定，先看看你怎么想。",
    example: "我想婚前给，但又怕影响孩子感情，所以一直没定。",
  }),
  q("inheritance_tools", "inheritance", "inheritanceTools", "现在有用遗嘱、信托或保单受益人做安排吗？", [
    ["will", "有遗嘱"], ["trust", "有信托 / 保险金信托"], ["beneficiary", "保单写了受益人"], ["none", "都没有"], ["unknown", "不清楚"],
  ], false, 3, {
    hint: "有就选，没有也没关系；很多人都是第一次认真想这件事。",
    example: "保单写了受益人，遗嘱和信托都没有。",
  }),
  q("inheritance_when", "inheritance", "inheritanceWhen", "这笔钱你希望什么时候给到孩子？", [
    ["now", "现在就给"], ["marriage", "孩子结婚时"], ["age35", "孩子 35 岁后"], ["batch", "分批给"], ["not_thought", "没想好"],
  ], false, 2, {
    open: true,
    hint: "一次性给、结婚时给、35 岁后给、分批给，结果和风险都不一样。",
    example: "不想一次给完，怕孩子乱花；想等他 35 岁以后再说。",
  }),
  q("inheritance_control", "inheritance", "inheritanceControl", "钱给到孩子后，你希望谁说了算？", [
    ["child", "孩子自己"], ["joint", "我和孩子一起管"], ["conditions", "设条件分批给"], ["not_thought", "没想好"],
  ], false, 2, {
    open: true,
    hint: "这其实是「控制权」问题：给出去之后，你还要不要保留一部分决定权。",
    example: "大钱还是想自己管，孩子需要用的时候再给。",
  }),
  q("inheritance_worry", "inheritance", "inheritanceWorry", "你最担心孩子拿到钱后发生什么？", [
    ["split", "被分走"], ["spend", "被挥霍"], ["manage", "不会管"], ["dispute", "家庭纠纷"], ["none", "没担心"],
  ], false, 2, {
    hint: "可以说具体一点，比如担心孩子婚姻变化、创业失败、被人骗。",
    example: "最怕孩子结婚后离婚，钱被分走一半。",
  }),

  // ===== 收支与资产（8 题，用于算 5 大指数）=====
  q("cashflow_income_source", "cashflow", "incomeSources", "家里主要收入来源是什么？", [
    ["salary", "工资"], ["business", "经营"], ["investment", "投资 / 房租"], ["mixed", "混合"], ["skip", "不想说"],
  ], false, 2, {
    hint: "主要是工资、经营收入，还是房租/投资？",
    example: "主要靠我工资，老婆收入少一点，还有一套房出租。",
  }),
  q("cashflow_income_range", "cashflow", "annualIncomeRange", "家庭年收入大概在哪个区间？", [
    ["under30", "30 万以下"], ["30_60", "30–60 万"], ["60_100", "60–100 万"], ["over100", "100 万以上"], ["skip", "不想说"],
  ], false, 3, {
    hint: "大概区间就行，不用精确；只用于估算风险预算，不会被保存。",
    example: "一年大概 60–80 万。",
  }),
  q("cashflow_expense_range", "cashflow", "annualExpenseRange", "家庭一年固定支出大概在哪个区间？", [
    ["under10", "10 万以下"], ["10_30", "10–30 万"], ["30_50", "30–50 万"], ["over50", "50 万以上"], ["skip", "不想说"],
  ], false, 3, {
    hint: "包括房贷、生活费、孩子教育、赡养老人等固定支出。",
    example: "房贷加生活费一年大概 25 万。",
  }),
  q("cashflow_income_stability", "cashflow", "incomeStability", "家里主要收入稳定吗？", [
    ["stable", "稳定"], ["fluctuating", "有波动"], ["unstable", "不稳定"], ["skip", "不想说"],
  ], false, 2, {
    hint: "比如体制内/大厂相对稳定；创业、销售、自由职业波动更大。",
    example: "我在互联网公司，收入还算稳定，但行业最近有裁员。",
  }),
  q("cashflow_passive", "cashflow", "passiveIncomeRange", "现在有房租、股息、年金这类被动收入吗？", [
    ["none", "没有"], ["small", "有一点"], ["partial", "能覆盖部分支出"], ["most", "能覆盖大部分支出"], ["skip", "不想说"],
  ], false, 3, {
    hint: "被动收入指不靠每天上班也能拿到的钱，比如房租、分红、年金。",
    example: "有一套房子出租，一年租金 6 万左右。",
  }),
  q("assets_liquid", "assets", "liquidAssetsRange", "家里能快速变现的钱大概多少？", [
    ["under50", "50 万以下"], ["50_100", "50–100 万"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ], false, 3, {
    hint: "包括活期、存款、货币基金、能快速卖的股票基金，不含自住房。",
    example: "存款加理财大概 80 万。",
  }),
  q("assets_fixed", "assets", "fixedAssetsRange", "房产、股权等固定资产大概在哪个区间？", [
    ["under100", "100 万以下"], ["100_300", "100–300 万"], ["300_500", "300–500 万"], ["500_1000", "500–1000 万"], ["over1000", "1000 万以上"], ["skip", "不想说"],
  ], false, 3, {
    hint: "按当前大概市值估算，包括自住房、投资房、企业股权。",
    example: "自住房大概 500 万，没有企业股权。",
  }),
  q("assets_debt", "assets", "totalDebtRange", "房贷、经营贷、担保大概多少？", [
    ["none", "没有"], ["under100", "100 万以下"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ], false, 3, {
    hint: "包括房贷余额、经营贷、对外担保；不确定可以选区间。",
    example: "房贷还剩 150 万左右。",
  }),
  q("assets_inheritance", "assets", "inheritanceAssetsRange", "已经用人寿保单、信托或遗嘱明确安排的资产大概多少？", [
    ["none", "没有"], ["under50", "50 万以下"], ["50_200", "50–200 万"], ["200_500", "200–500 万"], ["over500", "500 万以上"], ["skip", "不想说"],
  ], false, 3, {
    hint: "只算已经做了定向安排的部分；没有就选「没有」。",
    example: "有一份 100 万的寿险写了孩子受益人，其他没有安排。",
  }),

  // ===== 健康（2 题）=====
  q("health_conditions", "health", "preExistingConditions", "家里人有体检异常或既往症吗？", [
    ["none", "没有"], ["controlled", "有，已控制"], ["treating", "有，正在治疗"], ["skip", "不想说"],
  ], false, 2, {
    hint: "比如结节、高血压、血糖异常；不用写具体病史。",
    example: "我有甲状腺结节，医生说定期复查就行。",
  }),
  q("health_history", "health", "familyHistory", "家族里有重大疾病史吗？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ], false, 2, {
    hint: "父母、兄弟姐妹有没有癌症、心脑血管疾病等。",
    example: "父亲有高血压，母亲那边没有大病。",
  }),

  // ===== 教育（3 题）=====
  q("education_stage", "education", "childrenEducationStage", "孩子现在处于什么教育阶段？", [
    ["preschool", "学龄前"], ["primary", "小学"], ["middle", "中学"], ["college", "大学 / 留学"], ["worked", "已工作"],
  ], false, 2, {
    hint: "按最小的孩子或你最关心的孩子说。",
    example: "一个孩子上小学，一个已经工作。",
  }),
  q("education_plan", "education", "studyAbroadPlan", "有留学或大额教育计划吗？", [
    ["none", "没有"], ["domestic", "有，国内"], ["abroad", "有，留学"], ["undecided", "还没想"],
  ], false, 2, {
    hint: "留学、国际学校、考研都算大额教育计划。",
    example: "打算送孩子出国读本科，大概要准备 200 万。",
  }),
  q("education_budget", "education", "educationBudgetRange", "孩子的教育金大概准备了多少？", [
    ["none", "没准备"], ["under30", "30 万以下"], ["30_100", "30–100 万"], ["over100", "100 万以上"], ["skip", "不想说"],
  ], false, 2, {
    hint: "包括专门存的教育金、定投、保单等；不用精确。",
    example: "存了大概 50 万，还在继续存。",
  }),

  // ===== 养老（3 题）=====
  q("retirement_age", "retirement", "retirementAge", "你希望多大退休？", [
    ["before50", "50 岁前"], ["50_55", "50–55 岁"], ["55_60", "55–60 岁"], ["after60", "60 岁以后"], ["never", "没想过"],
  ], false, 2, {
    hint: "不用按法定退休年龄，按你希望的节奏说。",
    example: "希望 55 岁左右能半退休，不用再为生活费发愁。",
  }),
  q("retirement_income", "retirement", "retirementPlan", "退休后主要靠什么？", [
    ["social", "社保"], ["savings", "储蓄 / 理财"], ["passive", "房租 / 年金"], ["children", "子女"], ["never", "没想过"],
  ], false, 2, {
    hint: "社保、存款、房租、年金、子女支持，可以多选，先选主要的。",
    example: "主要靠社保和存款，没买过年金。",
  }),
  q("retirement_cashflow", "retirement", "retirementCashflow", "退休后希望每月大概有多少现金流？", [
    ["under5k", "5000 以下"], ["5_10k", "5000–1 万"], ["10_20k", "1–2 万"], ["over20k", "2 万以上"], ["not_thought", "没想过"],
  ], false, 2, {
    hint: "按你希望的生活水平估算，不用精确。",
    example: "希望每月至少 1 万，能覆盖生活和偶尔旅游。",
  }),

  // ===== 企业（4 题）=====
  q("business_ownership", "business", "businessOwnership", "家里有企业经营或股权吗？", [
    ["none", "没有"], ["self", "有，本人经营"], ["family", "有，家人经营"], ["passive", "有，但未参与"],
  ], false, 2, {
    hint: "持股、合伙、个体经营都算。",
    example: "我和朋友合伙开公司，我占 40% 股份。",
  }),
  q("business_guarantee", "business", "guarantees", "企业借钱时，有没有用个人或家庭资产做担保？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["no_business", "没有企业"],
  ], false, 3, {
    hint: "个人担保、房产抵押、连带责任都算；这是家企隔离的关键问题。",
    example: "公司贷款时我签了个人连带担保。",
  }),
  q("business_debt", "business", "businessDebtRange", "企业目前的负债或对外担保大概多少？", [
    ["none", "没有"], ["under100", "100 万以下"], ["100_300", "100–300 万"], ["over300", "300 万以上"], ["skip", "不想说"],
  ], false, 2, {
    hint: "大概区间就行，用于判断企业风险会不会牵连家庭。",
    example: "公司贷款加担保大概 200 万。",
  }),
  q("business_succession", "business", "succession", "企业将来打算怎么安排？", [
    ["child", "孩子接班"], ["professional", "职业经理人"], ["sell", "出售 / 退出"], ["not_thought", "没想好"], ["no_business", "没有企业"],
  ], false, 2, {
    hint: "孩子接不接班、要不要卖、要不要引入职业经理人，都会影响传承安排。",
    example: "孩子不想接班，我可能会卖掉公司。",
  }),

  // ===== 婚姻（3 题）=====
  q("marriage_status", "family", "maritalStatus", "你现在的婚姻状态？", [
    ["first", "初婚"], ["remarried", "再婚"], ["divorced", "离异"], ["widowed", "丧偶"], ["skip", "不想说"],
  ], true, 2, {
    hint: "再婚、离异、有前婚子女，都会影响财产归属和传承安排。",
    example: "我再婚了，前婚有一个孩子。",
  }),
  q("marriage_assets", "marriage", "preMaritalAssets", "婚前 / 婚内财产有书面约定吗？", [
    ["yes", "有"], ["no", "没有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ], false, 2, {
    hint: "婚前协议、婚内财产约定都算；没有也不代表一定有问题，先了解现状。",
    example: "没有书面约定，房子是婚后一起买的。",
  }),
  q("marriage_spouse_debt", "marriage", "spouseDebt", "配偶名下有没有经营负债或对外担保？", [
    ["none", "没有"], ["yes", "有"], ["unknown", "不清楚"], ["skip", "不想说"],
  ], false, 2, {
    hint: "配偶的债务在某些情况下可能影响家庭资产，先了解大概情况。",
    example: "老婆没有做生意，应该没有负债，但我不太确定。",
  }),

  // 医疗/养老的模块化问题（来源：中高端医疗六步、养老四笔钱）
  q("medical_priority", "protection", "medicalPriority", "医疗这块，你最在意的是哪一段？", [
    ["cost", "治疗费用"], ["hospital", "医院/医生选择"], ["drug", "药械/治疗方案"], ["income", "收入中断"], ["experience", "就医效率/体验"],
  ], false, 2, {
    hint: "来源：中高端医疗险需求分析六步（T021）第一步——先找主观动机，而不是先讲产品。",
    example: "我最怕治疗费不够，也怕找不到好医生。",
    source: "中高端医疗险需求分析六步（T021）",
    purpose: "判断医疗需求的主动机：费用、医院、药械、收入还是体验",
    hiddenRisk: true,
  }),
  q("medical_hospital", "protection", "hospitalLevel", "平时看病主要去普通部、特需/国际部还是私立？复杂疾病会考虑外地或海外吗？", [
    ["public", "普通部"], ["vip", "特需/国际部"], ["private", "私立/昂贵医院"], ["depends", "看病情"], ["unknown", "没想过"],
  ], false, 2, {
    hint: "来源：中高端医疗六步第二步——还原当前就医路径。",
    example: "平时去普通部，真有大病会考虑去北京或上海。",
    source: "中高端医疗险需求分析六步（T021）",
    purpose: "还原就医路径，判断真正想保留的医院/地域选择",
    hiddenRisk: true,
  }),
  q("retirement_care", "retirement", "carePlan", "如果失能或需要照护，谁来做决定、钱从哪出？", [
    ["family", "家人决定，用存款"], ["insurance", "提前用保险/年金准备"], ["trust", "信托/专业机构"], ["undecided", "没想过"],
  ], false, 2, {
    hint: "来源：养老四笔钱第三笔——看病尊严、失能康复和照护。",
    example: "真到那一步，可能靠老伴和孩子，钱先用存款。",
    source: "北京家庭养老四笔钱专场（R159/R160）第三笔",
    purpose: "挖高龄失能照护的隐性风险：谁决定、钱从哪出",
    hiddenRisk: true,
  }),
  q("retirement_four_money", "retirement", "fourMoney", "养老四笔钱里，你觉得哪一笔最薄？", [
    ["living", "生存的钱"], ["quality", "品质的钱"], ["care", "看病/照护的钱"], ["inheritance", "给孩子的钱"], ["unknown", "没算过"],
  ], false, 2, {
    hint: "来源：养老四笔钱框架——生存、品质、保障、传承，顺序不能反。",
    example: "生存的钱有社保，品质的钱没准备，看病的钱最薄。",
    source: "北京家庭养老四笔钱专场（R159/R160）",
    purpose: "定位养老四笔钱里最薄的一笔，作为优先级",
    hiddenRisk: true,
  }),
];

export function getQuestionById(id: string): Question | undefined {
  return QUESTION_BANK.find((question) => question.id === id);
}

export function getQuestionsForDimension(dimension: CheckupDimensionId): Question[] {
  return QUESTION_BANK.filter((question) => question.dimension === dimension);
}
