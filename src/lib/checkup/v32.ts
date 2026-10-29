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

function textOf(answers: V32Answer[], ids: string[]): string {
  return answers.filter((a) => ids.includes(a.questionId)).map((a) => a.answer).join(" ");
}

function hasTime(text: string): boolean {
  const negative = /(没想过|还没想|说不清|不知道|还没定)/.test(text);
  const timeWords = /(哪一年|哪年|几岁|什么时候|多久|20\d{2}|\d{2}\s*岁|还有几年|三年|五年|明年|退休年龄)/.test(text);
  if (negative && timeWords) return false;
  return timeWords;
}

function hasControl(text: string): boolean {
  const negative = /(没想过|还没想|不知道|还没定)/.test(text);
  const controlWords = /(谁管|谁来管|谁给|谁决定|受益人|一次给|分批|多大给|什么时候给|自己管)/.test(text);
  if (negative && controlWords) return false;
  return controlWords;
}

function hasBusiness(text: string): boolean {
  return /(生意|公司|经营|创业|贷款|担保|股权|合伙|开店|工厂)/.test(text);
}

export function getFollowupCandidates(answers: V32Answer[]): FollowupCandidate[] {
  const candidates: FollowupCandidate[] = [];
  const timeText = textOf(answers, ["v32_q4", "v32_q5", "v32_q7"]);
  const controlText = textOf(answers, ["v32_q5", "v32_q6", "v32_q8"]);
  const businessText = textOf(answers, ["v32_q4"]);

  if (timeText && !hasTime(timeText)) {
    candidates.push({
      id: "A",
      intent: "补时间锚点",
      fallback: "这件事大概在哪一年发生？从现在到那一年，还有多久？",
      source: "苏颖时间轴；李璞场景/时间/现金流",
    });
  }
  if (/(孩子|儿子|女儿|伴侣|配偶|老婆|老公|父母)/.test(controlText) && !hasControl(controlText)) {
    candidates.push({
      id: "B",
      intent: "补人/控制权",
      fallback: "这笔钱你希望谁来管？如果那时候孩子还小，你希望谁替他做决定？",
      source: "确权三问·谁管；王勇家庭结构图·谁替孩子做决定",
    });
  }
  if (hasBusiness(businessText)) {
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

export interface V32Dimension {
  name: string;
  status: "有安排" | "空白" | "待确认";
  evidence: string;
  mechanism: string;
  question: string;
}

export interface V32Risk {
  title: string;
  phenomenon: string;
  mechanism: string;
  priority: "高" | "中" | "低";
  question: string;
}

export interface V32Report {
  quotes: string[];
  dimensions: V32Dimension[];
  risks: V32Risk[];
  pending: string[];
  decision: { problem: string; education: string; solution: string };
  nextStep: string;
  disclaimer: string;
}

function answerOf(answers: V32Answer[], id: string): string {
  return answers.find((a) => a.questionId === id)?.answer || "";
}

function riskList(answers: V32Answer[]): V32Risk[] {
  const risks: V32Risk[] = [];
  const q6 = answerOf(answers, "v32_q6");
  const q8 = answerOf(answers, "v32_q8");
  const q4 = answerOf(answers, "v32_q4");
  const q3 = answerOf(answers, "v32_q3");
  if (/要凑|拿不出|压着|长期产品|房子/.test(q6)) {
    risks.push({
      title: "应急流动性可能偏紧",
      phenomenon: "遇到住院押金、失业过渡这类事，手头的钱可能要凑，或者被房子/长期产品压住。",
      mechanism: "流动性不是看总资产，而是看急用时能不能不亏本、不求人地拿出来；资产越重、越长期，短期越容易断。",
      priority: "高",
      question: "如果三个月内要用一笔钱，你最先会动哪一块？",
    });
  }
  const q8Negative = /(没想过|还没想|不知道|还没定)/.test(q8);
  if (/给孩子|留给孩子|给孩子留/.test(q8) && (q8Negative || !/谁管|分批|几岁|什么时候给/.test(q8))) {
    risks.push({
      title: "传承控制权还没有答案",
      phenomenon: "客户表达了“钱给孩子”，但没说什么时候给、一次给还是分批、给出去之后谁说了算。",
      mechanism: "给钱的时间和控制方式，决定这笔钱是孩子的保障，还是可能被婚姻、债务或挥霍影响。",
      priority: "高",
      question: "这笔钱你希望孩子多大拿到？一次给还是分几次？",
    });
  }
  if (hasBusiness(q4)) {
    risks.push({
      title: "家企边界需要确认",
      phenomenon: "家庭收入和企业经营交织，但个人担保、企业负债和家庭资产的边界还没说清。",
      mechanism: "企业贷款、个人连带担保、家企账户混用，都可能让企业风险穿透到家庭资产。",
      priority: "高",
      question: "生意上的贷款或担保，和家里的钱现在是分开的吗？",
    });
  }
  if (/住院|看病|医疗|费用/.test(q3)) {
    risks.push({
      title: "医疗费用与收入中断可能同时发生",
      phenomenon: "客户提到住院/看病的担心，但还没说费用由谁承担、收入中断怎么办。",
      mechanism: "大病不仅花治疗费，还会让家庭主要收入中断；两件事叠加，才是现金流压力最大的时候。",
      priority: "中",
      question: "如果住院时间长一点，收入这块会受多大影响？",
    });
  }
  if (/一个人|主要靠我|靠我/.test(q4)) {
    risks.push({
      title: "单一收入来源风险",
      phenomenon: "家庭收入主要靠一个人，这个人一旦不能工作，家庭现金流会同时受影响。",
      mechanism: "单一收入来源不是收入高低问题，而是家庭抗风险结构问题；收入越集中，中断时越难缓冲。",
      priority: "中",
      question: "如果这个人有半年不能工作，家里打算靠什么撑？",
    });
  }
  return risks.slice(0, 5);
}

function dimensionMap(answers: V32Answer[]): V32Dimension[] {
  const q6 = answerOf(answers, "v32_q6");
  const q8 = answerOf(answers, "v32_q8");
  const q4 = answerOf(answers, "v32_q4");
  const q7 = answerOf(answers, "v32_q7");
  const liquidityStatus: V32Dimension["status"] = /能|存款|活期/.test(q6) && !/要凑|拿不出/.test(q6) ? "有安排" : /要凑|拿不出|压着/.test(q6) ? "空白" : "待确认";
  const q8Negative = /(没想过|还没想|不知道|还没定)/.test(q8);
  const inheritanceStatus: V32Dimension["status"] = q8Negative
    ? "空白"
    : /谁管|分批|几岁|什么时候给/.test(q8)
      ? "有安排"
      : /给孩子|留给孩子/.test(q8)
        ? "待确认"
        : "空白";
  const freedomStatus: V32Dimension["status"] = q4 ? (/没想过|不知道/.test(q4) ? "空白" : "待确认") : "待确认";
  return [
    { name: "安全", status: liquidityStatus === "空白" ? "空白" : "待确认", evidence: q6 || "本次未提供", mechanism: "安全不是看有没有钱，而是看突发支出时家庭现金流会不会断。", question: "如果明天需要 3–6 个月生活费，你最先动哪一块？" },
    { name: "流动", status: liquidityStatus, evidence: q6 || "本次未提供", mechanism: "流动性看的是能不能马上、不亏本地拿出来，不是总资产多少。", question: "你的钱现在主要放在哪？急用时哪些能动？" },
    { name: "自由", status: freedomStatus, evidence: q4 || "本次未提供", mechanism: "自由不是收入高低，而是不靠每天上班也有钱进来的程度。", question: "如果不上班，你希望靠什么产生现金流？" },
    { name: "独立", status: "待确认", evidence: q7 || "本次未提供", mechanism: "独立看的是家庭责任有没有被现有资产和安排覆盖。", question: "未来 3–10 年必须花的钱，现在有专门准备吗？" },
    { name: "传承", status: inheritanceStatus, evidence: q8 || "本次未提供", mechanism: "传承看的是钱能不能按你的意愿、在你要的时间、给到你要的人。", question: "这笔钱你希望什么时候给、谁管、一次还是分批？" },
  ];
}

function pendingList(answers: V32Answer[]): string[] {
  const pending = [
    "现有保单清单：投保人、被保险人、受益人分别是谁",
    "家庭年收入/支出、流动资产、固定资产、负债的大概区间",
    "遗嘱/信托/婚前协议等法律文件是否已经书面化",
  ];
  if (/孩子|儿子|女儿/.test(answerOf(answers, "v32_q2"))) pending.push("孩子的年龄、婚否、未来教育/婚姻安排");
  if (/父母/.test(answerOf(answers, "v32_q2"))) pending.push("父母赡养/照护责任和遗产分配");
  if (hasBusiness(answerOf(answers, "v32_q4"))) pending.push("企业贷款、个人担保、股权和接班安排");
  if (/退休|养老/.test(answerOf(answers, "v32_q3"))) pending.push("退休后每月现金流目标和失能照护安排");
  return pending.slice(0, 6);
}

export function buildV32Report(answers: V32Answer[]): V32Report {
  const risks = riskList(answers);
  const primary = risks[0];
  const decision = {
    problem: primary
      ? `${primary.title}：${primary.phenomenon}`
      : "这次筛查没有发现明显高风险项，但还有几块信息没有采集。",
    education: primary
      ? `${primary.mechanism} 这不是运气问题，是结构和时间的问题；现在处理，成本通常低于事情发生后再补救。`
      : "没有数据不等于没有风险，只代表这次还没有看到；家庭结构、婚姻、企业、政策变化都可能改变结论。",
    solution: primary
      ? `先做一件事：${primary.question} 带着这个问题做一次 30 分钟一对一诊断，把答案落到具体安排上。`
      : "先约一次 30 分钟诊断，把报告里的待确认清单过一遍；不需要马上做购买决定。",
  };
  return {
    quotes: answers.filter((a) => a.answer.trim()).map((a) => a.answer.trim()).slice(0, 6),
    dimensions: dimensionMap(answers),
    risks,
    pending: pendingList(answers),
    decision,
    nextStep: "带上这份报告，约一次 30 分钟一对一诊断；只确认 1–3 个会改变判断的问题，不急着做产品决定。",
    disclaimer: "本报告为家庭风险筛查参考，不构成诊断、保险产品推荐、投保建议、法律或投资意见。具体安排请与持证专业人士和律师核对。",
  };
}
