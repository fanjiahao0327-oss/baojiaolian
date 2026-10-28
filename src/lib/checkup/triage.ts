import type { CheckupDomain, TriageResult } from "./types";

const KEYWORDS: Record<CheckupDomain, string[]> = {
  protection: ["保障", "重疾", "医疗", "生病", "保额", "保险够不够", "意外"],
  medical: ["医疗险", "百万医疗", "中高端医疗", "DRG", "外购药", "住院"],
  education: ["教育", "留学", "学费", "孩子上学", "教育金"],
  retirement: ["养老", "退休", "养老金", "老年生活"],
  inheritance: ["传承", "继承", "遗嘱", "受益人", "给孩子留", "孩子结婚", "婚前", "婚后", "分走", "挥霍", "信托"],
  business: ["企业", "公司", "股权", "担保", "家企", "债务", "经营"],
  marriage: ["婚姻", "离婚", "配偶", "再婚", "婚内", "婚前财产"],
};

const DOMAIN_ORDER: CheckupDomain[] = ["inheritance", "protection", "business", "marriage", "retirement", "education", "medical"];

export function triageFromText(text: string): TriageResult {
  const source = String(text || "");
  const scored = DOMAIN_ORDER.map((domain) => {
    const signals = KEYWORDS[domain].filter((word) => source.includes(word));
    return { domain, signals, score: signals.length };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { primaryDomain: "protection", secondaryDomain: null, confidence: 0.3, signals: [] };
  }

  const primary = scored[0];
  const secondary = scored[1] && scored[1].score > 0 ? scored[1] : null;
  const confidence = Math.min(0.9, 0.4 + primary.score * 0.1);
  return {
    primaryDomain: primary.domain,
    secondaryDomain: secondary?.domain ?? null,
    confidence,
    signals: [...primary.signals, ...(secondary?.signals ?? [])].slice(0, 6),
  };
}
