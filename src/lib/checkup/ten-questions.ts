import { getQuestionById } from "./question-bank";
import type { Answer } from "./types";

export interface TenFixedQuestion {
  id: string;
  index: number;
  title: string;
  prompt: string;
  guidance: string;
  source: string;
  purpose: string;
  rangeHint?: boolean;
}

/**
 * 10 题标准的第一版：8 个固定风险域问题 +（后续）2 个 AI 追问 + 1 个条件追问。
 * 8 题覆盖家庭、职业/企业、健康、养老、传承、婚姻、教育、资产现金流。
 */
export const TEN_FIXED_QUESTIONS: TenFixedQuestion[] = [
  {
    id: "ten_family",
    index: 1,
    title: "家庭与人生阶段",
    prompt:
      "先说说你家里的情况，以及为什么现在想了解保险。现在常住的有谁？结婚了吗？孩子多大、结婚了吗？父母那边需不需要你们照顾？有没有兄弟姐妹？如果有再婚、前婚子女或其他复杂关系，也可以一起说。",
    guidance:
      "不用写姓名，说关系和大概年龄就行。不知道从哪说，可以按「夫妻—孩子—父母—兄弟姐妹」的顺序；一句话、一段话都可以。",
    source: "一丁统一 KYC 九宫格·家庭婚姻/关心的人；王勇家庭结构图（只在复杂家庭时追加）",
    purpose: "一次拿到家庭结构、人生阶段和客户主动关注的原因",
  },
  {
    id: "ten_occupation",
    index: 2,
    title: "职业、企业与收入稳定性",
    prompt:
      "你（和配偶）现在做什么工作？是普通上班、自己经营企业或持股，还是已经退休？家里主要收入靠什么，稳定吗？企业有没有贷款、个人担保或合伙？",
    guidance:
      "收入可以只说区间，比如 30 万以下 / 30–60 万 / 60–100 万 / 100 万以上；企业经营不用说公司名，说大概谁在经营、有没有贷款或担保就行。",
    source: "一丁 KYC·工作与收支；王勇深度 KYC·企业情况；15 题体检·家业隔离",
    purpose: "判断职业/企业身份、收入稳定性、家企交织与个人担保",
    rangeHint: true,
  },
  {
    id: "ten_health",
    index: 3,
    title: "健康与医疗",
    prompt:
      "最近有没有什么事让你开始关注健康或医疗？家里人有体检异常、既往症或家族病史吗？现在医保、单位团险、商业医疗/重疾/寿险大概覆盖到什么程度？如果住院，你更在意治疗费、医院医生、药械选择，还是收入中断？",
    guidance:
      "不用写具体病史，说大概情况就行；保额不确定也可以说「不清楚」。就医可以选择普通部、特需/国际部、私立，或者「看病情」。",
    source: "中高端医疗险需求分析六步（T021）；健康险 KYC-KYP-KMS（T029）",
    purpose: "找到健康触发事件、已有保障和就医选择，挖收入中断/自费药等隐性风险",
  },
  {
    id: "ten_retirement",
    index: 4,
    title: "退休与养老",
    prompt:
      "你希望多大停止工作、多大开始领养老金？退休后每个月希望有多少现金流？现在主要靠社保、存款、房租还是年金？如果将来失能、需要照护，谁来决定、钱从哪出？",
    guidance:
      "按你希望的节奏说，不用按法定退休年龄；每月金额说个大概区间就行。养老不是一笔钱，可以按「日常生活、看病照护、品质、给孩子的钱」四块说。",
    source: "北京家庭养老四笔钱专场（R159/R160）；养老现金池与现金流",
    purpose: "判断退休时间、现金流缺口、被动收入和失能照护的隐性风险",
  },
  {
    id: "ten_inheritance",
    index: 5,
    title: "传承与继承",
    prompt:
      "家里的钱将来想给谁？希望什么时候、以什么方式给——一次给、孩子结婚时给、35 岁后给，还是分批给？给出去之后谁说了算？现在有遗嘱、信托、保单受益人安排吗？最担心孩子拿到钱后发生什么？",
    guidance:
      "先不用想工具，先说「想给谁、什么时候给、担心什么」；没有安排也没关系，直接说「还没想过」就行。",
    source: "《家庭财富传承确权三问三闸》V1.1；15 题体检·传承意愿；苏颖时间轴提问",
    purpose: "拿到给谁/谁管/怎么给、现有工具和最担心的传承后果",
  },
  {
    id: "ten_marriage",
    index: 6,
    title: "婚姻与财产",
    prompt:
      "你现在的婚姻状态？初婚、再婚、离异还是丧偶？婚前/婚内财产有书面约定吗？配偶名下有没有经营负债或对外担保？有前婚子女吗？",
    guidance:
      "只问与当前家庭结构有关的部分；不想说可以跳过。没有书面约定也不代表一定有问题，先了解现状。",
    source: "66 节保险法商课 PART1 婚姻（1–15 节）；民法典 1062/1063/1064",
    purpose: "识别婚前/婚内财产边界、配偶债务、前婚子女等婚姻财产风险",
  },
  {
    id: "ten_education",
    index: 7,
    title: "子女教育",
    prompt:
      "孩子现在什么阶段？你希望他/她未来走国内还是出国？大概哪一年要用大额教育金？现在准备了多少、谁出钱、这笔钱是给到孩子还是父母控制？",
    guidance:
      "按最小的孩子或你最关心的孩子说；教育金可以用区间，比如没准备 / 30 万以下 / 30–100 万 / 100 万以上。",
    source: "苏颖四步成交·储蓄险/教育金（P077–P113）；子女养育-教育金边界",
    purpose: "判断教育用钱时间、目标和教育金缺口，避免教育和养老混在一起",
  },
  {
    id: "ten_financial",
    index: 8,
    title: "资产与现金流",
    prompt:
      "最后用几个区间把家庭财务底稿补一下：家庭年收入、年支出、能快速变现的钱、房产/股权等固定资产、房贷/经营贷/担保、已经用保单/信托/遗嘱明确安排的传承资产。大概区间就行，不想说可以跳过。",
    guidance:
      "不用精确数字，说区间就行。比如：收入 30–60 万、支出 10–30 万、流动资产 50–100 万、固定资产 300–500 万、负债 100 万以下、传承资产还没有。",
    source: "《守富与传家》第 8 章 5 大指数公式；养老四笔钱·生存的钱",
    purpose: "为 5 维自检提供收入、支出、资产、负债、传承资产底稿",
    rangeHint: true,
  },
];

export interface TenAnswer {
  questionId: string;
  title: string;
  prompt: string;
  answer: string;
}

export interface TenSummary {
  sections: Array<{ title: string; body: string }>;
  missing: string[];
}

export function buildTenSummary(answers: TenAnswer[]): TenSummary {
  const sections: Array<{ title: string; body: string }> = [];
  const missing: string[] = [];
  for (const question of TEN_FIXED_QUESTIONS) {
    const answer = answers.find((item) => item.questionId === question.id);
    if (!answer || !answer.answer.trim()) {
      missing.push(question.title);
      continue;
    }
    sections.push({
      title: question.title,
      body: answer.answer.trim().slice(0, 500),
    });
  }
  const followups = answers.filter((item) => item.questionId.startsWith("ai_followup"));
  if (followups.length > 0) {
    sections.push({
      title: "AI 追问补充",
      body: followups.map((item) => `${item.prompt}\n${item.answer}`).join("\n\n"),
    });
  }
  return { sections, missing };
}


/* -------------------------------------------------------------------------- */
/* 固定题 → 结构化答案：题目是固定的，所以映射也应当是确定的，不交给模型猜。   */
/* -------------------------------------------------------------------------- */

function textOf(answers: TenAnswer[], id: string): string {
  return answers.find((answer) => answer.questionId === id)?.answer || "";
}

function matchRange(text: string, patterns: Array<[RegExp, string]>): string | null {
  for (const [pattern, value] of patterns) {
    if (pattern.test(text)) return value;
  }
  return null;
}

function segment(text: string, keywords: string[]): string {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index >= 0) {
      return text.slice(index).split(/[，。；;]/)[0];
    }
  }
  return "";
}

export function tenAnswersToStructured(answers: TenAnswer[]): Answer[] {
  const fields = new Map<string, string>();
  const add = (id: string, value: string | null) => {
    if (!value) return;
    const question = getQuestionById(id);
    if (!question) return;
    if (!question.options.some((option) => option.value === value)) return;
    fields.set(id, value);
  };

  const family = textOf(answers, "ten_family");
  if (/三代|父母.*一起住/.test(family)) add("family_members", "three_gen");
  else if (/孩子|儿子|女儿/.test(family)) add("family_members", "children");
  else if (/夫妻|老婆|老公|爱人/.test(family)) add("family_members", "couple");
  if (/没有孩子|没孩子|无子女|丁克/.test(family)) add("family_children", "none");
  else if (/孩子.*(已经|刚)?结婚|儿子.*结婚|女儿.*结婚/.test(family)) add("family_children", "married");
  else if (/孩子.*(工作|上班|未婚)/.test(family)) add("family_children", "working");
  else if (/孩子.*(小学|中学|高中|大学|上学|幼儿园|读书)/.test(family)) add("family_children", "school");
  if (/再婚|二婚/.test(family)) add("marriage_status", "remarried");
  else if (/离婚|离异/.test(family)) add("marriage_status", "divorced");
  else if (/丧偶/.test(family)) add("marriage_status", "widowed");
  else if (/初婚|已婚|结婚/.test(family)) add("marriage_status", "first");
  if (/独生/.test(family)) add("family_siblings", "only_child");
  else if (/兄弟姐妹|弟弟|妹妹|哥哥|姐姐/.test(family)) add("family_siblings", "harmony");
  if (/父母.*(身体|健康|不需要)/.test(family)) add("family_parents", "healthy");
  else if (/父母.*(照顾|赡养|养老)/.test(family)) add("family_parents", "care");

  const occupation = textOf(answers, "ten_occupation");
  if (/没有企业|没有经营|没有公司/.test(occupation) && !/自己.*(开公司|经营|创业)/.test(occupation)) {
    add("family_business", "none");
  } else if (/自己.*(开公司|办企业|做生意|创业|经营|持股|股东|老板)|我是.*老板/.test(occupation)) {
    add("family_business", "self");
  } else if (/(配偶|老婆|老公|爱人).{0,20}(经营|开公司|做生意|企业|公司)/.test(occupation)) {
    add("family_business", "family");
  } else if (/普通职工|上班|打工|教师|公务员|退休/.test(occupation)) {
    add("family_business", "none");
  }
  add(
    "cashflow_income_range",
    matchRange(occupation, [
      [/30\s*[-~到–]\s*60/, "30_60"],
      [/60\s*[-~到–]\s*100/, "60_100"],
      [/100\s*万以上|100\s*万\+/, "over100"],
      [/30\s*万以下/, "under30"],
    ]),
  );
  if (/没有.*担保|无.*担保|没有个人担保/.test(occupation)) add("business_guarantee", "none");
  else if (/个人.*担保|连带.*担保|签过.*担保/.test(occupation)) add("business_guarantee", "yes");
  add(
    "business_debt",
    matchRange(occupation, [
      [/没有.*(负债|贷款)|无.*(负债|贷款)/, "none"],
      [/100\s*万以下/, "under100"],
      [/100\s*[-~到–]\s*300/, "100_300"],
      [/300\s*万以上/, "over300"],
    ]),
  );

  const health = textOf(answers, "ten_health");
  if (/只有社保|没有商业医疗|没买商业医疗/.test(health)) add("protection_medical", "social_only");
  else if (/百万医疗/.test(health)) add("protection_medical", "million");
  else if (/中高端医疗|高端医疗/.test(health)) add("protection_medical", "mid_high");
  if (/没有重疾|没买重疾|重疾.*没有|没有.*重疾/.test(health)) add("protection_critical", "none");
  if (/甲状腺|结节|高血压|糖尿病|手术|住院|既往症/.test(health)) {
    add("health_conditions", /复查|控制|稳定/.test(health) ? "controlled" : "treating");
  }
  if (/没有.*寿险|没有.*意外|只有社保/.test(health)) add("protection_life", "none");

  const retirement = textOf(answers, "ten_retirement");
  if (/50\s*岁前/.test(retirement)) add("retirement_age", "before50");
  else if (/50\s*[-~到–]\s*55/.test(retirement)) add("retirement_age", "50_55");
  else if (/55\s*[-~到–]\s*60|55\s*岁/.test(retirement)) add("retirement_age", "55_60");
  else if (/60\s*岁以后/.test(retirement)) add("retirement_age", "after60");
  if (/主要靠社保|靠社保/.test(retirement)) add("retirement_income", "social");
  else if (/存款|储蓄/.test(retirement)) add("retirement_income", "savings");
  else if (/房租|年金/.test(retirement)) add("retirement_income", "passive");
  if (/没有.*(房租|年金|被动收入)|没有.*被动/.test(retirement)) add("cashflow_passive", "none");

  const inheritance = textOf(answers, "ten_inheritance");
  if (/没有.*遗嘱|没有.*信托|没写受益人|没有.*受益人|都没有/.test(inheritance)) {
    add("inheritance_tools", "none");
  } else if (/信托/.test(inheritance)) add("inheritance_tools", "trust");
  else if (/遗嘱/.test(inheritance)) add("inheritance_tools", "will");
  else if (/写了.*受益人|保单.*受益人/.test(inheritance)) add("inheritance_tools", "beneficiary");
  if (/分批/.test(inheritance)) add("inheritance_when", "batch");
  else if (/结婚时/.test(inheritance)) add("inheritance_when", "marriage");
  else if (/35\s*岁/.test(inheritance)) add("inheritance_when", "age35");
  else if (/一次性|现在就给/.test(inheritance)) add("inheritance_when", "now");
  if (/婚姻变化|被分走|离婚.*分/.test(inheritance)) add("inheritance_worry", "split");
  if (/想留给孩子|给孩子的钱/.test(inheritance) && !/已经.*遗嘱|已经.*信托/.test(inheritance)) {
    add("inheritance_intent", "thought");
  }

  const marriage = textOf(answers, "ten_marriage");
  if (/再婚|二婚/.test(marriage)) add("marriage_status", "remarried");
  else if (/离异|离婚/.test(marriage)) add("marriage_status", "divorced");
  else if (/丧偶/.test(marriage)) add("marriage_status", "widowed");
  else if (/初婚|已婚/.test(marriage)) add("marriage_status", "first");
  if (/没有.*书面|没有.*协议|没有约定/.test(marriage)) add("marriage_assets", "no");
  else if (/有.*书面|有.*协议|有约定/.test(marriage)) add("marriage_assets", "yes");
  if (/配偶.*没有.*(负债|担保)|没有.*配偶.*(负债|担保)/.test(marriage)) add("marriage_spouse_debt", "none");
  else if (/配偶.*(负债|担保)|有.*经营负债/.test(marriage)) add("marriage_spouse_debt", "yes");

  const education = textOf(answers, "ten_education");
  if (/学龄前|幼儿园/.test(education)) add("education_stage", "preschool");
  else if (/小学/.test(education)) add("education_stage", "primary");
  else if (/中学|初中|高中/.test(education)) add("education_stage", "middle");
  else if (/大学|留学/.test(education)) add("education_stage", "college");
  else if (/已经.*工作|已工作/.test(education)) add("education_stage", "worked");
  if (/出国|留学/.test(education)) add("education_plan", "abroad");
  else if (/国内/.test(education)) add("education_plan", "domestic");
  else if (/没想|不确定/.test(education)) add("education_plan", "undecided");
  if (/没准备|没有准备/.test(education)) add("education_budget", "none");
  else if (/30\s*万以下/.test(education)) add("education_budget", "under30");
  else if (/30\s*[-~到–]\s*100/.test(education)) add("education_budget", "30_100");
  else if (/100\s*万以上/.test(education)) add("education_budget", "over100");

  const financial = textOf(answers, "ten_financial");
  add(
    "cashflow_income_range",
    matchRange(segment(financial, ["年收入", "收入"]), [
      [/30\s*[-~到–]\s*60/, "30_60"],
      [/60\s*[-~到–]\s*100/, "60_100"],
      [/100\s*万以上|100\s*万\+/, "over100"],
      [/30\s*万以下/, "under30"],
    ]) ?? fields.get("cashflow_income_range") ?? null,
  );
  add(
    "cashflow_expense_range",
    matchRange(segment(financial, ["年支出", "支出"]), [
      [/10\s*[-~到–]\s*30/, "10_30"],
      [/30\s*[-~到–]\s*50/, "30_50"],
      [/50\s*万以上/, "over50"],
      [/10\s*万以下/, "under10"],
    ]),
  );
  add(
    "assets_liquid",
    matchRange(segment(financial, ["流动资产", "快速变现", "现金"]), [
      [/50\s*万以下/, "under50"],
      [/50\s*[-~到–]\s*100/, "50_100"],
      [/100\s*[-~到–]\s*300/, "100_300"],
      [/300\s*万以上/, "over300"],
    ]),
  );
  add(
    "assets_fixed",
    matchRange(segment(financial, ["固定资产", "房产", "股权"]), [
      [/100\s*万以下/, "under100"],
      [/100\s*[-~到–]\s*300/, "100_300"],
      [/300\s*[-~到–]\s*500/, "300_500"],
      [/500\s*[-~到–]\s*1000/, "500_1000"],
      [/1000\s*万以上/, "over1000"],
    ]),
  );
  add(
    "assets_debt",
    matchRange(segment(financial, ["房贷", "负债", "经营贷", "担保"]), [
      [/没有.*(负债|贷款)|无.*(负债|贷款)/, "none"],
      [/100\s*万以下/, "under100"],
      [/100\s*[-~到–]\s*300/, "100_300"],
      [/300\s*万以上/, "over300"],
    ]),
  );
  add(
    "assets_inheritance",
    matchRange(segment(financial, ["传承资产", "保单", "信托", "遗嘱"]), [
      [/传承资产.*没有|没有.*传承资产|没有.*安排/, "none"],
      [/50\s*万以下/, "under50"],
      [/50\s*[-~到–]\s*200/, "50_200"],
      [/200\s*[-~到–]\s*500/, "200_500"],
      [/500\s*万以上/, "over500"],
    ]),
  );

  return Array.from(fields.entries()).map(([questionId, value]) => {
    const question = getQuestionById(questionId)!;
    return {
      questionId,
      dimension: question.dimension,
      field: question.field,
      value,
      skipped: false,
    };
  });
}
