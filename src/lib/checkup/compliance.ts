export type CheckupComplianceCode =
  | "product_name"
  | "premium_quote"
  | "guarantee"
  | "claim"
  | "peer_blame"
  | "underwriting"
  | "fear"
  | "legal_advice";

export interface CheckupComplianceRisk {
  code: CheckupComplianceCode;
  label: string;
  evidence: string;
}

const RULES: Array<{ code: CheckupComplianceCode; label: string; pattern: RegExp }> = [
  { code: "product_name", label: "产品/公司名称", pattern: /友邦|国寿|平安|太保|泰康|复星|万欣和|传世无忧|欣享人生|光辉岁月|医路相伴/ },
  { code: "premium_quote", label: "保费/费率/现价/收益演示", pattern: /保费(?!报价)|费率|现价|年化|收益演示|回本|领取金额/ },
  { code: "guarantee", label: "收益或领取承诺", pattern: /稳赚|保本|保证领取|一定增值|肯定增值|不会亏/ },
  { code: "claim", label: "理赔结果承诺", pattern: /一定赔|保证理赔|理赔没问题|肯定能赔/ },
  { code: "peer_blame", label: "贬低同业", pattern: /原代理人.{0,8}没讲清楚|别家.{0,6}不好|其他公司.{0,6}骗人/ },
  { code: "underwriting", label: "核保结论预判", pattern: /顶多加费|肯定承保|一定标准体/ },
  { code: "fear", label: "恐吓/焦虑表达", pattern: /再不买就晚了|出事了就完了|连生病资格都没有/ },
  { code: "legal_advice", label: "法律结论", pattern: /一定有效|肯定能避债|保证不会被分走/ },
];

export function scanCheckupCompliance(content: string): CheckupComplianceRisk[] {
  const risks: CheckupComplianceRisk[] = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    for (const rule of RULES) {
      if (risks.some((risk) => risk.code === rule.code)) continue;
      const match = rule.pattern.exec(line);
      if (!match) continue;
      risks.push({ code: rule.code, label: rule.label, evidence: line.slice(0, 120) });
    }
  }
  return risks;
}

export function buildCheckupRewritePrompt(risks: CheckupComplianceRisk[]): string {
  return `你上一版报告出现以下合规风险：${risks.map((risk) => risk.label).join("、")}。请重写完整报告，删除产品名、费率、收益承诺、理赔承诺、同业贬低、核保预判、恐吓表达和法律结论；保留风险判断与行动建议。`;
}

export async function ensureCheckupCompliance(
  content: string,
  rewrite: (prompt: string) => Promise<string>,
): Promise<{ content: string; rewritten: boolean; risks: CheckupComplianceRisk[] }> {
  const risks = scanCheckupCompliance(content);
  if (risks.length === 0) return { content, rewritten: false, risks: [] };
  const rewrittenContent = (await rewrite(buildCheckupRewritePrompt(risks))).trim();
  if (rewrittenContent && scanCheckupCompliance(rewrittenContent).length === 0) {
    return { content: rewrittenContent, rewritten: true, risks };
  }
  return {
    content: "本次报告涉及需要人工核对的内容。建议先核对合同条款、现金价值表、核保资料或理赔材料，再进行针对性沟通。以上不构成保险产品推荐或投保建议。",
    rewritten: true,
    risks,
  };
}
