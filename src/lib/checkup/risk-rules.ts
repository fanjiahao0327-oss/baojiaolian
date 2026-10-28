import type { Answer, RiskItem } from "./types";

const DISCLAIMER = "以上为风险自查参考，不构成保险产品推荐、投保建议或法律意见。";

function valueOf(answers: Answer[], questionId: string): string | null {
  return answers.find((answer) => answer.questionId === questionId)?.value ?? null;
}

function has(answers: Answer[], questionId: string, values: string[]): boolean {
  const value = valueOf(answers, questionId);
  return value !== null && values.includes(value);
}

export function buildRiskItems(answers: Answer[], indices: Array<{ name: string; level: string }>): RiskItem[] {
  const risks: RiskItem[] = [];

  if (has(answers, "protection_critical", ["none", "under30"]) || has(answers, "protection_medical", ["social_only"])) {
    risks.push({
      title: "家庭保障缺口：大病和医疗自付风险",
      severity: "high",
      phenomenon: "目前重疾或商业医疗险覆盖不足，家庭主要靠社保和存款应对大病。",
      whyItMatters: "大病治疗和康复期收入中断，会同时消耗存款和家庭现金流。",
      ifIgnored: "一旦发生大病，家庭可能被迫动用长期储蓄、卖房或借钱，影响孩子教育和养老安排。",
      suggestedAction: "先核对社保报销范围，再按家庭收入测算医疗险和重疾险的保障缺口；具体产品线下核对合同。",
      sourceRefs: ["5大指数-安全指数", "66问-保障类"],
    });
  }

  if (has(answers, "family_children", ["married"]) && has(answers, "inheritance_tools", ["none", "unknown"])) {
    risks.push({
      title: "传承定向风险：给孩子的钱可能被分走",
      severity: "high",
      phenomenon: "孩子已结婚，但家里还没有用遗嘱、信托或保单受益人做定向安排。",
      whyItMatters: "没有明确安排时，财产按法定继承走，孩子的婚姻变动或家庭纠纷可能影响这笔钱。",
      ifIgnored: "想给孩子的钱可能被分割、被债务追及，或由不希望的人参与分配。",
      suggestedAction: "先梳理家庭结构、资产归属和给钱时点；再决定用受益人、遗嘱还是信托补位，法律文件请律师核对。",
      sourceRefs: ["确权三问三闸-给谁/谁管/怎么给", "66问-C 传承/继承", "6+1-婚姻风险"],
    });
  }

  if (has(answers, "family_siblings", ["harmony", "conflict"]) && has(answers, "inheritance_tools", ["none", "unknown"])) {
    risks.push({
      title: "兄弟姐妹与父母遗产流向风险",
      severity: "medium",
      phenomenon: "家里有兄弟姐妹，但父母那边的财产安排和继承顺序还没有书面梳理。",
      whyItMatters: "兄弟姐妹先于父母去世时，可能发生代位继承；父母去世后，遗产会在兄弟姐妹及其子女之间分配，容易产生争议。",
      ifIgnored: "父母的遗产可能不按你的预期流向，甚至影响你想留给自己孩子的钱；家庭关系也可能因分配问题紧张。",
      suggestedAction: "先画清家庭结构图，确认父母财产的归属和继承顺序；需要时用遗嘱、受益人指定或信托明确安排，法律文件请律师核对。",
      sourceRefs: ["民法典 1127/1128 继承与代位继承", "确权三问三闸-风险层", "66问-C 传承/继承"],
    });
  }

  if (has(answers, "business_ownership", ["self", "family"]) && has(answers, "business_guarantee", ["yes"])) {
    risks.push({
      title: "家企混同风险：企业债务可能牵连家庭",
      severity: "high",
      phenomenon: "企业借款使用了个人或家庭资产担保，家庭资产与企业债务没有清晰隔离。",
      whyItMatters: "企业出现债务或执行风险时，家庭资产可能被追及，影响家人生活与传承安排。",
      ifIgnored: "企业风险可能穿透到家庭，导致房产、存款或保单被用于偿债，传承计划被打断。",
      suggestedAction: "先盘点企业负债、担保和家庭资产边界，再评估合法合规的隔离安排；涉及法律与税务问题转专业人士。",
      sourceRefs: ["确权三问三闸-风险层", "66问-D 债务/家企"],
    });
  }

  if (has(answers, "marriage_status", ["remarried", "divorced"]) || has(answers, "marriage_assets", ["no", "unknown"])) {
    risks.push({
      title: "婚姻财产归属风险：婚前/婚内边界不清",
      severity: "medium",
      phenomenon: "婚姻状态或财产约定存在不确定性，婚前/婚内资产边界没有书面文件。",
      whyItMatters: "婚姻变动时，资产归属和分割方式容易产生争议，影响孩子和家庭安排。",
      ifIgnored: "可能出现资产混同、分割争议，或原本想留给孩子的钱被重新分配。",
      suggestedAction: "先梳理婚前/婚内资产来源与登记，再评估是否需要书面约定；法律文件请律师核对。",
      sourceRefs: ["确权三问三闸-风险层-婚姻", "66问-B 婚姻/婚前"],
    });
  }

  const safety = indices.find((item) => item.name === "安全指数");
  if (safety?.level === "red") {
    risks.push({
      title: "安全指数偏低：家庭应急金和保障不足",
      severity: "high",
      phenomenon: "家庭应急储备、负债或保障覆盖存在明显缺口。",
      whyItMatters: "收入中断或突发支出时，家庭现金流容易断裂。",
      ifIgnored: "可能需要借贷、卖资产或中断长期计划，家庭财务稳定性下降。",
      suggestedAction: "先补 3–6 个月应急金，再核对医疗、重疾、寿险保额；不急于买产品。",
      sourceRefs: ["5大指数-安全指数", "守富与传家"],
    });
  }

  const inheritance = indices.find((item) => item.name === "传承指数");
  if (inheritance?.level === "red" && has(answers, "family_children", ["married", "working"])) {
    risks.push({
      title: "传承指数偏低：传承性资产占比不足",
      severity: "medium",
      phenomenon: "家庭资产中通过人寿保险、信托或遗嘱明确安排的传承性资产占比较低。",
      whyItMatters: "传承性资产不足时，财富传递更多依赖法定继承，确定性较低。",
      ifIgnored: "传承过程可能出现争议、时间延误或资产外流。",
      suggestedAction: "先明确给谁、谁管、怎么给，再评估保险、信托、遗嘱的组合；不点名具体产品。",
      sourceRefs: ["5大指数-传承指数", "6+1-继承风险"],
    });
  }

  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  return risks
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 5)
    .map((risk) => ({ ...risk, ifIgnored: `${risk.ifIgnored}${DISCLAIMER}` }));
}
