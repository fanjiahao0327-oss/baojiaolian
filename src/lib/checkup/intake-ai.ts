import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import {
  deriveProfileFromText,
  emptyProfile,
  mergeProfile,
  type ConcernKey,
  type IntakeProfile,
  type Occupation,
} from "./profile";

const CONCERNS: ConcernKey[] = ["health", "inheritance", "retirement", "business", "marriage", "education", "family"];
const OCCUPATIONS: Occupation[] = ["employee", "business_owner", "family_business", "retired", "other", "unknown"];

interface AIExtraction {
  occupation?: string;
  concerns?: string[];
  children?: string;
  marital?: string;
  parents?: string;
  siblings?: string;
  medical?: string;
  critical?: string;
  life?: string;
  policyRoles?: string;
  incomeRange?: string;
  expenseRange?: string;
  liquid?: string;
  fixed?: string;
  debt?: string;
  inheritanceAssets?: string;
  businessGuarantee?: string;
  inheritanceTools?: string;
  health?: string;
  educationPlan?: string;
  retirementAge?: string;
  retirementIncome?: string;
  reflection?: string;
}

const SYSTEM_PROMPT = `你是保险家庭风险测评的「客户信息解析器」。只做信息提取，不给建议、不推理客户没说过的事。
输入是客户自己的开场描述。请输出严格 JSON，字段如下；客户没说的填 unknown 或空数组，不要猜。
{
  "occupation": "employee|business_owner|family_business|retired|other|unknown",
  "concerns": ["health","inheritance","retirement","business","marriage","education","family"],
  "children": "none|school|working|married|unknown",
  "marital": "first|remarried|divorced|widowed|unknown",
  "parents": "healthy|financial|care|unknown",
  "siblings": "only_child|harmony|conflict|unknown",
  "medical": "million|mid_high|social_only|unknown",
  "critical": "none|under30|30_50|over50|unknown",
  "life": "both|accident_only|life_only|none|unknown",
  "policyRoles": "clear|partial|unknown|none|unknown",
  "incomeRange": "under30|30_60|60_100|over100|unknown",
  "expenseRange": "under10|10_30|30_50|over50|unknown",
  "liquid": "under50|50_100|100_300|over300|unknown",
  "fixed": "under100|100_300|300_500|500_1000|over1000|unknown",
  "debt": "none|under100|100_300|over300|unknown",
  "inheritanceAssets": "none|under50|50_200|200_500|over500|unknown",
  "businessGuarantee": "none|yes|unknown|no_business",
  "inheritanceTools": "will|trust|beneficiary|none|unknown",
  "health": "none|controlled|treating|unknown",
  "educationPlan": "none|domestic|abroad|undecided|unknown",
  "retirementAge": "before50|50_55|55_60|after60|never|unknown",
  "retirementIncome": "social|savings|passive|children|never|unknown",
  "reflection": "用客户的口吻复述一句你听到的重点，30-60 字，不要下结论"
}
规则：
- 普通职工不要标成企业主；只有客户明确说自己开公司/做生意/持股，或配偶经营，才标 business_owner/family_business。
- 孩子结婚、孩子上学、父母需要照顾，都按客户原话提取。
- 保单角色：客户说“不知道受益人是谁”才标 unknown；只是提到保单标 partial。
- 金额只按客户说过的区间提取；客户没说就 unknown。
- 不输出产品名、公司名、收益承诺、法律结论。`;

function normalizeAI(raw: AIExtraction): Partial<IntakeProfile> {
  const fields: Record<string, string> = {};
  const put = (id: string, value: string | undefined, allowed: string[]) => {
    if (!value || value === "unknown" || value === "skip") return;
    if (allowed.includes(value)) fields[id] = value;
  };

  const occupation = OCCUPATIONS.includes(raw.occupation as Occupation)
    ? (raw.occupation as Occupation)
    : "unknown";
  if (occupation === "business_owner") put("family_business", "self", ["self"]);
  if (occupation === "family_business") put("family_business", "family", ["family"]);
  if (occupation === "employee" || occupation === "retired") put("family_business", "none", ["none"]);

  put("family_children", raw.children, ["none", "school", "working", "married"]);
  put("marriage_status", raw.marital, ["first", "remarried", "divorced", "widowed"]);
  put("family_parents", raw.parents, ["healthy", "financial", "care"]);
  put("family_siblings", raw.siblings, ["only_child", "harmony", "conflict"]);
  put("protection_medical", raw.medical, ["million", "mid_high", "social_only"]);
  put("protection_critical", raw.critical, ["none", "under30", "30_50", "over50"]);
  put("protection_life", raw.life, ["both", "accident_only", "life_only", "none"]);
  put("protection_policy_roles", raw.policyRoles, ["clear", "partial", "unknown", "none"]);
  put("cashflow_income_range", raw.incomeRange, ["under30", "30_60", "60_100", "over100"]);
  put("cashflow_expense_range", raw.expenseRange, ["under10", "10_30", "30_50", "over50"]);
  put("assets_liquid", raw.liquid, ["under50", "50_100", "100_300", "over300"]);
  put("assets_fixed", raw.fixed, ["under100", "100_300", "300_500", "500_1000", "over1000"]);
  put("assets_debt", raw.debt, ["none", "under100", "100_300", "over300"]);
  put("assets_inheritance", raw.inheritanceAssets, ["none", "under50", "50_200", "200_500", "over500"]);
  put("business_guarantee", raw.businessGuarantee, ["none", "yes", "no_business"]);
  put("inheritance_tools", raw.inheritanceTools, ["will", "trust", "beneficiary", "none"]);
  put("health_conditions", raw.health, ["none", "controlled", "treating"]);
  put("education_plan", raw.educationPlan, ["none", "domestic", "abroad", "undecided"]);
  put("retirement_age", raw.retirementAge, ["before50", "50_55", "55_60", "after60", "never"]);
  put("retirement_income", raw.retirementIncome, ["social", "savings", "passive", "children", "never"]);

  const concerns = Array.isArray(raw.concerns)
    ? raw.concerns.filter((item): item is ConcernKey => CONCERNS.includes(item as ConcernKey))
    : [];

  return {
    occupation,
    concerns,
    fields,
    reflection: raw.reflection?.trim() || "",
  };
}

/**
 * 开场第一段用模型做结构化解析；失败时退回规则解析。
 * 文本只在本次请求内存里使用，不落库、不写日志。
 */
export async function extractIntakeProfile(text: string): Promise<IntakeProfile> {
  const fallback = deriveProfileFromText(text);
  const clean = text.trim().slice(0, 1500);
  if (!clean || !process.env.DEEPSEEK_API_KEY) return fallback;

  try {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: clean },
      ],
      response_format: { type: "json_object" },
    } as never);
    const content = completion.choices[0]?.message?.content || "";
    const raw = JSON.parse(content) as AIExtraction;
    const ai = normalizeAI(raw);
    // 只保留开场原话里真的有依据的担心方向，避免模型自行加戏
    const evidence = new Set(fallback.concerns);
    return mergeProfile(mergeProfile(emptyProfile(), fallback), {
      ...ai,
      concerns: ai.concerns?.filter((item) => evidence.has(item)),
    });
  } catch {
    return fallback;
  }
}
