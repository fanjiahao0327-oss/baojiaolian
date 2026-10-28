export type CoachComplianceRiskCode =
  | "benefit_guarantee"
  | "claim_guarantee"
  | "peer_blame"
  | "underwriting_prediction"
  | "fear_pressure";

export interface CoachComplianceRisk {
  code: CoachComplianceRiskCode;
  label: string;
  evidence: string;
}

interface ComplianceRule {
  code: CoachComplianceRiskCode;
  label: string;
  pattern: RegExp;
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    code: "benefit_guarantee",
    label: "收益或保险利益承诺",
    pattern:
      /稳赚不赔|闭着眼买|(?:肯定|一定|保证)(?:会|能|每年|持续|长期)?(?:增值|上涨|赚钱|拿到|到账|领取|不亏|收益|有收益)|确定(?:能|可以|每年)?(?:拿到|到账|领取|获得).{0,8}(?:金额|收益|钱|多少)?|随时.{0,8}(?:取|拿).{0,12}(?:不亏|不会亏)|回本点.{0,18}(?:不亏|不会亏)/,
  },
  {
    code: "claim_guarantee",
    label: "理赔结果承诺",
    pattern:
      /(?:肯定|一定|保证).{0,10}(?:赔|理赔)|理赔.{0,24}(?:一定|肯定|保证|没问题|顺利)|有人.{0,8}跑腿.{0,16}理赔.{0,12}(?:没问题|顺利)/,
  },
  {
    code: "peer_blame",
    label: "无事实依据归责原代理人或同业",
    pattern:
      /(?:原|之前|当时).{0,8}(?:销售|代理人|业务员|做方案的人).{0,12}(?:没|没有|不).{0,8}(?:讲清楚|说明白)|(?:那家|别家|其他).{0,8}(?:公司|保险公司).{0,12}(?:不好|骗人|拖延|故意不赔)/,
  },
  {
    code: "underwriting_prediction",
    label: "核保结论预判",
    pattern:
      /顶多.{0,16}(?:标准体|加费|除外|延期|拒保)|(?:肯定|一定|保证).{0,10}(?:承保|标准体|加费|除外|延期|拒保)|(?:只会|最多).{0,10}(?:加费|除外)/,
  },
  {
    code: "fear_pressure",
    label: "恐惧或压力式表达",
    pattern:
      /连.{0,8}(?:生病|休息|倒下).{0,8}资格都没有|不买.{0,12}(?:后悔|来不及)|真出事.{0,16}(?:扛不住|就完了)/,
  },
];

const EXPLANATION_MARKERS =
  /原话|客户说|客户问|禁止|不得|不能|不要|避免|不应|不可|错误|问题|风险|红线/;

function isExplanationOnly(line: string, matchIndex: number): boolean {
  const prefix = line.slice(0, matchIndex);
  return EXPLANATION_MARKERS.test(prefix);
}

export function scanCoachCompliance(content: string): CoachComplianceRisk[] {
  const risks: CoachComplianceRisk[] = [];
  const seen = new Set<CoachComplianceRiskCode>();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    for (const rule of COMPLIANCE_RULES) {
      if (seen.has(rule.code)) continue;
      const match = rule.pattern.exec(line);
      if (!match || isExplanationOnly(line, match.index)) continue;
      seen.add(rule.code);
      risks.push({
        code: rule.code,
        label: rule.label,
        evidence: line.slice(0, 180),
      });
    }
  }

  return risks;
}

export function buildCoachComplianceRewritePrompt(
  risks: CoachComplianceRisk[],
): string {
  const details = risks
    .map((risk, index) => `${index + 1}. ${risk.label}：${risk.evidence}`)
    .join("\n");

  return `你上一版回答命中了以下合规风险：
${details}

请重写完整回答，不要只修改单句，也不要解释修改过程。

重写要求：
- 涉及年金、分红险、终身寿、现金价值或领取金额时，明确区分合同载明的保证利益与非保证利益；不得承诺收益、增值、领取金额、回本时间或“不亏”。
- 涉及理赔时，只能说明代理人可协助整理材料和跟进流程；理赔结论只能依据具体合同和保险公司审核。
- 未查看保单、理赔决定书或其他事实材料前，不得归责原代理人、原销售人员、保险公司或同业。
- 涉及健康告知和核保时，不得预判结论；可以列出标准体、加费、除外、延期、拒保等可能，并明确最终以保险公司的正式核保结论为准。
- 删除恐吓、灾难化、逼单和绝对化表达。
- 保留原回答中合理的阶段判断、顾问式沟通结构与免责声明。`;
}

export function buildCoachComplianceFallback(
  risks: CoachComplianceRisk[],
): string {
  const labels = risks.map((risk) => risk.label).join("、");
  return `本次问题涉及${labels || "保险专业边界"}。为避免形成不准确承诺，建议代理人先补充具体合同、利益演示、现金价值表、核保资料或理赔决定书，再进行针对性沟通。

在资料未核实前，请保持以下边界：
- 不承诺收益、领取金额、现金价值增长、回本时间或理赔结果；
- 不评价原代理人、保险公司或同业；
- 不预判核保结论，最终以保险公司的正式审核结果为准；
- 只帮助客户梳理问题、核对资料和明确下一步。

> ⚠️ 以上内容为 AI 生成的销售沟通参考建议，不构成保险产品推荐或投保建议。最终方案请以保险公司正式条款为准，如有疑问请咨询持牌机构专业人员。`;
}

export async function ensureCoachResponseCompliance(
  content: string,
  rewrite: (prompt: string) => Promise<string>,
): Promise<{
  content: string;
  rewritten: boolean;
  risks: CoachComplianceRisk[];
}> {
  const risks = scanCoachCompliance(content);
  if (risks.length === 0) {
    return { content, rewritten: false, risks: [] };
  }

  const rewrittenContent = (await rewrite(
    buildCoachComplianceRewritePrompt(risks),
  )).trim();
  if (
    rewrittenContent &&
    scanCoachCompliance(rewrittenContent).length === 0
  ) {
    return { content: rewrittenContent, rewritten: true, risks };
  }

  return {
    content: buildCoachComplianceFallback(risks),
    rewritten: true,
    risks,
  };
}
