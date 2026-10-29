export type Route = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface V32Question {
  id: string;
  title: string;
  prompt: string;
  guidance: string;
  source: string;
}

export interface V32Answer {
  questionId: string;
  title: string;
  prompt: string;
  answer: string;
}

export const ROUTE_LABELS: Record<Route, string> = {
  A: "医疗",
  B: "大病",
  C: "养老",
  D: "子女",
  E: "传承",
  F: "生意",
  G: "说不清",
};

export const V32_FIXED: V32Question[] = [
  {
    id: "v32_q1",
    title: "触发点",
    prompt: "是什么事让你现在想看看家里的风险？",
    guidance: "比如最近有件事让你有点感慨；或者一直想理一理没动手；也可以就说“说不上来”。",
    source: "陈庚预咨询“先接住、不马上盘问”；李璞“KYC 在聊天里完成”",
  },
  {
    id: "v32_q2",
    title: "家庭结构",
    prompt: "家里现在都有谁？",
    guidance: "父母、兄弟姐妹、伴侣、孩子，说个大概就行；孩子多大、结婚没，父母需不需要你们照顾，也可以一起说。",
    source: "一丁 KYC 九宫格·家庭婚姻；王勇家庭结构图只在复杂家庭/家企时追加",
  },
  {
    id: "v32_q4",
    title: "收入结构",
    prompt: "家里这份收入，主要靠一个人还是两个人？是工资、生意，还是退休金？这两年稳不稳？",
    guidance: "比如主要靠我 / 两个人一起；工资 / 做生意 / 退休金；做生意的话，收入是不是看年景。",
    source: "一丁 KYC·工作与收支；李璞计划书·场景/时间/现金流",
  },
  {
    id: "v32_q6",
    title: "应急流动性",
    prompt: "如果家里突然遇到住院押金、失业过渡、孩子临时学费这类事，需要先拿出 3–6 个月的生活费，你手上的钱能马上拿出来吗？主要从哪出？",
    guidance: "比如能，存款/活期就能覆盖；要凑一凑，可能要动理财或找家人；拿不出来，钱主要在房子、生意或长期产品里。",
    source: "李璞“快速变现能力比总资产更能说明问题”；《守富与传家》流动维度",
  },
  {
    id: "v32_q7",
    title: "优先级",
    prompt: "如果这些事里只能先解决一件，你最想先解决哪件？",
    guidance: "比如看病 / 养老 / 给孩子留钱 / 生意上的事 / 还没想好。",
    source: "陈庚“定下一步”；李璞“客户亲口确认的目标与优先级”",
  },
  {
    id: "v32_q8",
    title: "传承兜底",
    prompt: "如果将来要把钱留给孩子，你希望怎么到他们手上？",
    guidance: "没想过也正常；比如一次性给 / 分几年 / 等他到某个年纪；到时候谁管，也可以说。",
    source: "确权三问·给谁/谁管/怎么给；15 题体检·传承意愿",
  },
];

export const V32_BRANCHES: Record<Route, { label: string; q3: V32Question; q5: V32Question }> = {
  A: {
    label: "医疗",
    q3: { id: "v32_q3", title: "医疗第一层", prompt: "家里人住院，你最担心的是什么？", guidance: "比如治疗费 / 医院和医生选择 / 药械 / 收入中断 / 没人照顾。", source: "中高端医疗六步·第一步；健康险 KYC·把脉" },
    q5: { id: "v32_q5", title: "医疗第二层", prompt: "那要是住院时间长一点，收入这块有影响吗？", guidance: "比如工资照发 / 会少很多 / 生意会停 / 没想过。", source: "中高端医疗六步·第四步；安全维度" },
  },
  B: {
    label: "大病",
    q3: { id: "v32_q3", title: "大病第一层", prompt: "家里主要挣钱的人，要是有一段时间不能工作，日子怎么过？", guidance: "比如靠存款 / 靠另一半 / 靠家人 / 没想过。", source: "健康险 KYC-KYP-KMS；苏颖四步·后果" },
    q5: { id: "v32_q5", title: "大病第二层", prompt: "这段时间的开销，你打算从哪出？", guidance: "比如存款 / 理财 / 找家人 / 还没想好。", source: "健康险 KYC-KYP-KMS；安全维度" },
  },
  C: {
    label: "养老",
    q3: { id: "v32_q3", title: "养老第一层", prompt: "你希望退休以后，日子主要靠什么过？", guidance: "比如社保 / 存款 / 房租 / 年金 / 子女 / 没想过。", source: "养老四笔钱·第一笔；李璞场景/时间/现金流" },
    q5: { id: "v32_q5", title: "养老第二层", prompt: "从你不上班那天起，这笔钱谁来给？", guidance: "比如社保 / 自己提前存 / 房租年金 / 子女 / 还没想好。", source: "养老四笔钱·第一笔；养老现金池与现金流" },
  },
  D: {
    label: "子女",
    q3: { id: "v32_q3", title: "子女第一层", prompt: "孩子这笔钱，你希望什么时候用得上？", guidance: "比如还有几年 / 已经在上了 / 还没想好。", source: "苏颖教育金场景 P077–P113；李璞时间/现金流" },
    q5: { id: "v32_q5", title: "子女第二层", prompt: "到时候是你给，还是孩子自己管？", guidance: "比如父母管 / 孩子自己管 / 看情况 / 没想过。", source: "确权三问·谁管；李璞“给多少是钱的事，怎么给才是你的事”" },
  },
  E: {
    label: "传承",
    q3: { id: "v32_q3", title: "传承第一层", prompt: "家里的钱，你希望最后交到谁手上？", guidance: "比如给孩子 / 给几个人分 / 还没想好。", source: "确权三问·给谁；15 题体检·传承意愿" },
    q5: { id: "v32_q5", title: "传承第二层", prompt: "你希望他多大拿到、一次拿还是分几次拿？", guidance: "没想过也正常；比如现在 / 结婚时 / 35 岁后 / 分批。", source: "确权三问·怎么给；15 题体检·传承意愿" },
  },
  F: {
    label: "生意",
    q3: { id: "v32_q3", title: "生意第一层", prompt: "生意上的钱和家里的钱，现在是分开的吗？", guidance: "比如分开 / 有一部分混着 / 没细想过。", source: "王勇深度 KYC·企业；15 题体检·家业隔离" },
    q5: { id: "v32_q5", title: "生意第二层", prompt: "万一生意上有事，家里的房子和存款会受影响吗？", guidance: "比如不会 / 可能会 / 不清楚。", source: "王勇深度 KYC·企业；15 题体检·家业隔离" },
  },
  G: {
    label: "说不清",
    q3: { id: "v32_q3", title: "说不清第一层", prompt: "如果只能先解决一件事，你心里最先想到哪件？", guidance: "比如看病 / 养老 / 给孩子留钱 / 生意上的事 / 还没想好。", source: "陈庚“定下一步”；李璞目标与优先级" },
    q5: { id: "v32_q5", title: "说不清第二层", prompt: "那件事要是发生了，现在家里扛得住吗？", guidance: "比如扛得住 / 要凑一凑 / 扛不住 / 没想过。", source: "苏颖四步·后果；安全维度" },
  },
};

export interface FollowupCandidate {
  id: "A" | "B" | "C";
  intent: string;
  fallback: string;
  source: string;
}

export interface V32Facts {
  hasChildren: boolean;
  hasPartner: boolean;
  isBusinessOwner: boolean;
}

function rawAnswer(answers: V32Answer[], id: string): string {
  return answers.find((answer) => answer.questionId === id)?.answer || "";
}

export function detectFacts(answers: V32Answer[]): V32Facts {
  const family = rawAnswer(answers, "v32_q2");
  const income = rawAnswer(answers, "v32_q4");
  const childNegative = /(没有孩子|没孩子|无子女|丁克|不打算要孩子|还没有孩子)/.test(family);
  const partnerNegative = /(单身|离异|离婚|丧偶|没有伴侣|没结婚)/.test(family);
  const hasChildren = !childNegative && /(孩子|儿子|女儿|子女)/.test(family);
  const hasPartner = !partnerNegative && /(老公|老婆|爱人|配偶|伴侣|先生|太太|丈夫|妻子|已婚|夫妻|两口子|我们俩|老伴)/.test(family);
  const ownerText = `${family} ${income}`;
  const isBusinessOwner = /(自己开|自己经营|自己办|创业|持股|股东|老板|做生意|开工厂|开公司|企业主|经营工厂|经营公司)/.test(ownerText);
  return { hasChildren, hasPartner, isBusinessOwner };
}

function textOf(answers: V32Answer[], ids: string[]): string {
  return answers.filter((a) => ids.includes(a.questionId)).map((a) => a.answer).join(" ");
}

function hasTime(text: string): boolean {
  const negative = /(没想过|还没想|没想好|说不清|不知道|还没定|没安排)/.test(text);
  const timeWords = /(哪一年|哪年|几岁|什么时候|多久|20\d{2}|\d{2}\s*岁|还有几年|三年|五年|明年|退休年龄)/.test(text);
  if (negative && timeWords) return false;
  return timeWords;
}

function hasControl(text: string): boolean {
  const negative = /(没想过|还没想|没想好|不知道|还没定|没安排)/.test(text);
  const controlWords = /(谁管|谁来管|谁给|谁决定|受益人|一次给|分批|多大给|什么时候给|自己管)/.test(text);
  if (negative && controlWords) return false;
  return controlWords;
}

function hasBusiness(text: string): boolean {
  return /(生意|公司|经营|创业|贷款|担保|股权|合伙|开店|工厂)/.test(text);
}

export function getFollowupCandidates(answers: V32Answer[]): FollowupCandidate[] {
  const candidates: FollowupCandidate[] = [];
  const facts = detectFacts(answers);
  const timeText = textOf(answers, ["v32_q4", "v32_q5", "v32_q7"]);
  const controlText = textOf(answers, ["v32_q5", "v32_q6", "v32_q8"]);

  if (timeText && !hasTime(timeText)) {
    candidates.push({
      id: "A",
      intent: "补时间锚点",
      fallback: "这件事大概在哪一年发生？从现在到那一年，还有多久？",
      source: "苏颖时间轴；李璞场景/时间/现金流",
    });
  }
  if (facts.hasChildren && /(孩子|儿子|女儿|子女)/.test(controlText) && !hasControl(controlText)) {
    candidates.push({
      id: "B",
      intent: "补人/控制权",
      fallback: "这笔钱你希望谁来管？如果那时候孩子还小，你希望谁替他做决定？",
      source: "确权三问·谁管；王勇家庭结构图·谁替孩子做决定",
    });
  }
  if (facts.isBusinessOwner) {
    candidates.push({
      id: "C",
      intent: "补家企隔离",
      fallback: "生意上的钱和家里的钱，现在是分开的吗？",
      source: "王勇深度 KYC·企业；15 题体检·家业隔离",
    });
  }
  return candidates;
}

export interface V32Summary {
  sections: Array<{ title: string; body: string }>;
  missing: string[];
}

export function buildV32Summary(answers: V32Answer[]): V32Summary {
  const sections: Array<{ title: string; body: string }> = [];
  const missing: string[] = [];
  for (const answer of answers) {
    if (!answer.answer.trim()) {
      missing.push(answer.title);
      continue;
    }
    sections.push({ title: answer.title, body: answer.answer.trim().slice(0, 500) });
  }
  return { sections, missing };
}

export interface V32Issue {
  title: string;
  phenomenon: string;
  why: string;
  solution: string;
  firstStep: string;
  priority: "高" | "中" | "低";
}

export interface V32Report {
  conclusion: string;
  heard: string[];
  issues: V32Issue[];
  nextStep: string;
  disclaimer: string;
  facts: V32Facts;
}

function answerOf(answers: V32Answer[], id: string): string {
  return answers.find((a) => a.questionId === id)?.answer || "";
}

function buildHeard(answers: V32Answer[], facts: V32Facts): string[] {
  const family = answerOf(answers, "v32_q2");
  const income = answerOf(answers, "v32_q4");
  const familyLine = `家里${facts.hasPartner ? "有伴侣" : "目前没有提到伴侣"}，${facts.hasChildren ? "有孩子" : "没有孩子"}${/父母/.test(family) ? "，父母也需要一起考虑" : ""}。`;
  const incomeLine = facts.isBusinessOwner
    ? "收入和企业经营绑在一起，生意上的贷款或担保可能会影响家庭。"
    : /(一个人|主要靠我(?!们)|靠我一个人|只靠我)/.test(income)
      ? "家庭收入比较集中，主要靠一个人。"
      : "家庭收入来源相对分散，不是只靠一个人。";
  const concernLine = /住院|看病|医疗|治疗/.test(answerOf(answers, "v32_q3"))
    ? "你这次最先提到的是医疗和收入中断。"
    : /退休|养老/.test(answerOf(answers, "v32_q3") + income)
      ? "你这次最先提到的是养老和长期现金流。"
      : "你这次最关心的是家庭现金流和家人安排。";
  return [familyLine, incomeLine, concernLine];
}

function buildIssues(answers: V32Answer[], facts: V32Facts): V32Issue[] {
  const issues: V32Issue[] = [];
  const q8 = answerOf(answers, "v32_q8");
  const q6 = answerOf(answers, "v32_q6");
  const q4 = answerOf(answers, "v32_q4");
  const q3 = answerOf(answers, "v32_q3");
  const q2 = answerOf(answers, "v32_q2");
  const push = (issue: V32Issue) => {
    if (!issues.some((item) => item.title === issue.title)) issues.push(issue);
  };

  if (facts.isBusinessOwner) {
    push({
      title: "家庭和企业的钱没有完全分开",
      phenomenon: "你的收入和企业经营绑在一起，可能存在企业贷款、个人担保或账户混用。",
      why: "企业风险不会只停在公司。个人担保、连带责任、家企账户混用，都可能让企业问题穿透到家庭资产。",
      solution: "先把个人担保、企业贷款、家庭资产列清楚；企业账户和家庭账户分开；涉及担保和股权的事，找会计和律师核对。",
      firstStep: "列一张表：企业贷款多少、谁签的担保、家里哪些资产可能被牵连。",
      priority: "高",
    });
  }
  if (/再婚|前婚|前夫|前妻|继子|继女/.test(q2)) {
    push({
      title: "再婚家庭的传承边界需要先理清",
      phenomenon: "家庭里有前婚子女和现任家庭成员，钱和房产未来怎么分还没有明确安排。",
      why: "再婚家庭最容易出问题的不是钱不够，而是“谁有份、谁决定、什么时候给”没有提前说清。",
      solution: "先列清前婚子女、现任子女、房产、保单受益人；再确定分配原则和决策人；涉及遗嘱/协议的部分找律师。",
      firstStep: "写一页纸：每一笔主要资产想给谁、什么时候给、谁来决定。",
      priority: "高",
    });
  }
  if (facts.hasChildren && /(两个|三个|一儿一女|两个孩子|三个孩子)/.test(q2)) {
    push({
      title: "多子女家庭需要先定分配原则",
      phenomenon: "家里不止一个孩子，但钱怎么分、谁做决定、什么时候给还没有统一说法。",
      why: "平均分不一定公平，按需分也不一定服众；没有规则，最后容易变成家庭矛盾。",
      solution: "先定原则：平均/按需/给照顾多的人；再定决策人和沟通时点；最后才看工具。",
      firstStep: "把几个孩子的情况和你的真实想法写下来，先不急着定金额。",
      priority: "高",
    });
  }
  if (facts.hasChildren && q8 && (/(没想过|还没想|没想好|还没定|没安排|不知道)/.test(q8) || !/谁管|分批|几岁|什么时候给/.test(q8))) {
    push({
      title: "给孩子的钱，给法还没有答案",
      phenomenon: "你表达了钱要给孩子，但什么时候给、一次给还是分批、给出去之后谁说了算，还没有想清楚。",
      why: "给钱的时间和控制方式，决定这笔钱是孩子的保障，还是可能被婚姻、债务或挥霍影响。",
      solution: "先写清三件事：给谁、什么时候给、谁管；再核对保单受益人、遗嘱或信托是否需要调整。",
      firstStep: "写下“孩子多大给、一次还是分批、谁替他管”这三句话。",
      priority: "高",
    });
  }
  if (/(退休|养老)/.test(q4 + q3)) {
    push({
      title: "退休后的现金流和照护还没有拆开",
      phenomenon: "你提到了退休/养老，但退休后每月钱从哪来、失能时谁决定、照护费用从哪出，还没有分开算。",
      why: "养老不是一笔钱，是日常、医疗照护、品质和给孩子的钱四笔；不拆开，容易低估长期缺口。",
      solution: "按四笔钱拆：日常、医疗照护、品质、给孩子的钱；先算社保/退休金覆盖多少，再看缺口和照护决策人。",
      firstStep: "写下退休后每月固定开销，以及社保/退休金大概能覆盖多少。",
      priority: "中",
    });
  }
  if (/父母/.test(q2) && /(照顾|赡养|照护|身体不好|年纪大|需要人)/.test(q2 + q3)) {
    push({
      title: "父母的照护和费用还没落到人",
      phenomenon: "父母需要一起考虑，但谁照顾、钱从哪出、重大决定谁来做，还没有明确。",
      why: "照护不是只花钱，还涉及时间、决策和家庭分工；不提前说清，事情来了容易乱。",
      solution: "先确认父母的医疗/照护费用来源，再确定主要决策人和分担方式；必要时开一次家庭会议。",
      firstStep: "和父母/兄弟姐妹确认：真到需要照护时，谁做主、谁出钱、谁出力。",
      priority: "中",
    });
  }
  if (/要凑|拿不出|压着|长期产品|房子/.test(q6)) {
    push({
      title: "急用钱时，现金可能不够快",
      phenomenon: "遇到住院押金、失业过渡这类事，手头的钱可能要凑，或者被房子/长期产品压住。",
      why: "流动性不是看总资产，而是看急用时能不能不亏本、不求人地拿出来；资产越重，短期越容易断。",
      solution: "先把钱分三类：随时能动、要凑一凑、动不了；优先留出 3–6 个月生活费在随时能动的地方。",
      firstStep: "算一下家里每月固定开销，乘以 3–6，看看现在能动用的钱够不够。",
      priority: "高",
    });
  }
  if (/(一个人|主要靠我(?!们)|靠我一个人|只靠我)/.test(q4)) {
    push({
      title: "家庭收入太集中",
      phenomenon: "家庭收入主要靠一个人，这个人一旦不能工作，家庭现金流会同时受影响。",
      why: "收入越集中，中断时越难缓冲；这不是收入高低问题，是家庭抗风险结构问题。",
      solution: "先算主要收入者半年不能工作的现金流缺口，再看保障、储蓄和家庭分工怎么补。",
      firstStep: "列出每月必须支出，算一算“半年没有这份收入”会缺多少。",
      priority: "高",
    });
  }
  if (/住院|看病|医疗|治疗|费用/.test(q3)) {
    push({
      title: "医疗费用和收入中断可能一起来",
      phenomenon: "你担心医疗，但治疗费、自费药、收入中断这几件事还没有分开看。",
      why: "大病不只花治疗费，还会让家庭主要收入中断；两件事叠加，才是现金流压力最大的时候。",
      solution: "先核对医保、单位团险、商业医疗的实际覆盖；把治疗费、自费药、收入中断分开算。",
      firstStep: "找出医保卡、单位团险和已有保单，确认住院能报什么、不能报什么。",
      priority: "中",
    });
  }
  if (issues.length === 0) {
    push({
      title: "这次信息还不够形成判断",
      phenomenon: "这次回答里没有出现明显的高风险信号，但家庭结构、收入、流动性还有空白。",
      why: "没有信号不等于没有风险，可能只是这次没有问到；家庭结构、婚姻、企业和政策变化都会改变结论。",
      solution: "先补三块：家庭成员和年龄、收入结构、急用钱时能不能拿出来；补完再看风险。",
      firstStep: "把家庭结构、主要收入来源、3–6 个月生活费这三件事写清楚。",
      priority: "低",
    });
  }
  return issues.slice(0, 3);
}

export function buildV32Report(answers: V32Answer[]): V32Report {
  const facts = detectFacts(answers);
  const issues = buildIssues(answers, facts);
  const first = issues[0];
  return {
    conclusion: first ? `这次最该先处理的不是产品，而是「${first.title}」。` : "这次信息还不够形成判断，先把家庭结构和现金流补齐。",
    heard: buildHeard(answers, facts),
    issues,
    nextStep: first
      ? `先做一件事：${first.firstStep} 带着这一步和 1–2 个问题，约一次 30 分钟诊断。`
      : "先补家庭结构、收入来源和 3–6 个月生活费，再约一次 30 分钟诊断。",
    disclaimer: "本报告为家庭风险筛查参考，不构成诊断、保险产品推荐、投保建议、法律或投资意见。具体安排请与持证专业人士和律师核对。",
    facts,
  };
}
