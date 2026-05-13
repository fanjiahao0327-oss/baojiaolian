"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { KYCFormData, ArrayField, SectionConfig, FieldConfig, ClientSummary } from "@/types";
import { useAuth } from "@/components/UserProvider";

interface Props {
  onSubmit: (formData: KYCFormData, clientId: number | null) => void;
  isLoading: boolean;
  clientRefreshKey?: number;
  initialClientId?: number | null;
}

const EMPTY_FORM: KYCFormData = {
  clientName: "", age: "", gender: "", city: "", maritalStatus: "", childrenDetail: "",
  personality: "", healthCondition: "", hobbies: "", parentsDetail: "",
  clientIndustry: "", clientPosition: "", careerDevelopment: "", breadwinner: "",
  spouseIndustry: "", spousePosition: "", monthlyExpense: "", majorExpensePlan: "",
  incomeSources: [], incomeSourcesOther: "", fixedAssets: "",
  annualIncome: "", liquidAssets: "", investmentAmount: "",
  investmentStyle: "", riskTolerance: "", liabilities: "", expensePressure: "",
  protectionInsurance: "", savingsInsurance: "", otherInsurance: "", insuranceAttitude: "",
  step1Notes: "", step2Notes: "", step3Notes: "", step4Notes: "",
  triggerScenario: "", clientOriginalWords: "",
  clientObjection: "", agentResponse: "",
  pastInteraction: "",
};

function getDraftKey(userId: number): string {
  return `kyc_draft_${userId}`;
}

const sections: SectionConfig[] = [
  {
    title: "客户画像与生活状态",
    fields: [
      { key: "clientName", label: "姓名", type: "text", required: true, priority: "recommended", placeholder: "例如：张先生、李姐、王总" },
      { key: "gender", label: "性别", type: "radio", required: true, priority: "recommended", options: ["male", "female"] },
      { key: "age", label: "年龄", type: "number", required: true, priority: "recommended", placeholder: "年龄决定生命周期定位：青年积累期 / 中年责任期 / 退休传承期" },
      { key: "city", label: "工作&居住城市", type: "text", required: true, priority: "recommended", placeholder: "例如：上海" },
      { key: "healthCondition", label: "身体情况", type: "text", priority: "recommended", placeholder: "直接影响核保与投保优先级，例如：健康 / 有高血压/糖尿病 / 曾患XX已康复" },
      { key: "maritalStatus", label: "婚姻状况", type: "radio", required: true, priority: "recommended", options: ["未婚", "已婚", "离异", "丧偶", "再婚"] },
      { key: "childrenDetail", label: "子女详情", type: "text", priority: "recommended", placeholder: "子女数量/年龄/就读阶段，例如：儿子/8岁/公立小学；女儿/3岁/未入学 / 无" },
      { key: "parentsDetail", label: "父母情况", type: "text", priority: "optional", placeholder: "是否健在、是否同住、赡养责任，例如：父母健在/同住/需赡养 / 父亲已故/母亲独居有退休金" },
      { key: "personality", label: "性格特征", type: "text", priority: "optional", placeholder: "MBTI/性格色彩/沟通偏好，例如：ISTJ 重视数据细节，需用条款佐证 / ENFP 关注愿景感受" },
      { key: "hobbies", label: "兴趣爱好", type: "text", priority: "optional", placeholder: "反映客户愿投入时间金钱的领域，例如：全球旅行、马拉松、收藏红酒、高尔夫" },
      { key: "step1Notes", label: "如有补充", type: "text", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "工作与收支",
    fields: [
      { key: "clientIndustry", label: "行业&公司", type: "text", priority: "recommended", placeholder: "判断收入的稳定性与可持续性，例如：互联网/字节跳动、教育/新东方" },
      { key: "clientPosition", label: "职责&职位", type: "text", priority: "recommended", placeholder: "例如：技术专家/负责核心算法研发、企业主/独立经营" },
      { key: "careerDevelopment", label: "职业发展空间", type: "select", priority: "recommended", options: ["稳定或上升期", "瓶颈期或面临裁员", "创业或自雇，生意波动较大", "已退休或全职家庭"] },
      { key: "breadwinner", label: "家庭经济支柱", type: "select", priority: "recommended", options: ["客户本人", "配偶", "夫妻共同", "父母"], placeholder: "核心：一旦支柱倒下，家庭现金流会断裂多久" },
      { key: "incomeSources", label: "主要收入来源", type: "checkbox-group", priority: "recommended", options: ["工资收入", "经营收入", "房租收入", "投资分红", "其他"] },
      { key: "annualIncome", label: "家庭年收入（万元）", type: "number", priority: "recommended", placeholder: "例如：30（填大概数字即可）" },
      { key: "spouseIndustry", label: "配偶行业&公司", type: "text", priority: "optional", placeholder: "例如：互联网/字节跳动、教育/新东方、全职家庭" },
      { key: "spousePosition", label: "配偶职责&职位", type: "text", priority: "optional", placeholder: "例如：中层管理/负责运营团队、技术专家" },
      { key: "monthlyExpense", label: "月度固定支出（万元）", type: "number", priority: "optional", placeholder: "含房贷/车贷/生活开支，例如：1.5" },
      { key: "majorExpensePlan", label: "未来大额支出计划", type: "textarea", priority: "optional", placeholder: "购房/子女教育/医疗/养老，例如：3年内换房需200万首付、孩子5年后留学需100万" },
      { key: "step2Notes", label: "如有补充", type: "text", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "资产情况",
    fields: [
      { key: "fixedAssets", label: "固定资产", type: "text", priority: "recommended", placeholder: "例如：自住房1套、投资房1套、汽车1辆 — 高房产占比可能意味着流动性不足" },
      { key: "liquidAssets", label: "流动资产合计（万元）", type: "number", priority: "recommended", placeholder: "现金+存款+短期理财，例如：50" },
      { key: "liabilities", label: "负债情况", type: "text", priority: "recommended", placeholder: "流动负债+长期负债，例如：房贷200万/月供1.2万、信用卡5万、其他无" },
      { key: "investmentAmount", label: "投资金额（万元）", type: "number", priority: "optional", placeholder: "含股票/基金/股权等，例如：20" },
      { key: "investmentStyle", label: "投资偏好", type: "select", priority: "optional", options: ["保守型（存款为主）", "稳健型（基金理财为主）", "进取型（股票/股权为主）"] },
      { key: "riskTolerance", label: "风险承受能力", type: "select", priority: "optional", options: ["低（不愿承担本金损失）", "中（可接受小幅波动）", "高（追求高收益）"], placeholder: "保险方案的储蓄/投资推荐不可逾越客户实际风险等级" },
      { key: "expensePressure", label: "支出压力感知", type: "select", priority: "optional", options: ["无明显经济压力", "有房贷或房租压力", "子女教育开销较大", "日常消费高难以存下钱"] },
      { key: "step3Notes", label: "如有补充", type: "text", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "已有保障",
    fields: [
      { key: "protectionInsurance", label: "保障类保险", type: "text", priority: "recommended", placeholder: "例如：百万医疗/年交500元；重疾险50万保额/年交8000元；意外险100万/年交300元；定期寿险200万/保至60岁" },
      { key: "savingsInsurance", label: "储蓄类保险", type: "text", priority: "recommended", placeholder: "例如：年金险年交5万×10年/60岁起领；增额终身寿年交10万×5年/资产传承" },
      { key: "insuranceAttitude", label: "对保险的态度", type: "select", priority: "recommended", options: ["满意，配置比较全面", "买了但不太清楚保障内容", "觉得保额不够想补充", "没买过商业保险", "对保险持怀疑或排斥态度"] },
      { key: "otherInsurance", label: "其他保险", type: "text", priority: "optional", placeholder: "例如：企业团体险、惠民保等" },
      { key: "step4Notes", label: "如有补充", type: "text", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "面谈入口",
    fields: [
      { key: "triggerScenario", label: "触发场景", type: "select", required: true, priority: "recommended", options: ["客户主动咨询（有明确原话）", "非主动咨询（代理人通过社交激活话题）"] },
      { key: "clientOriginalWords", label: "客户原话或背景描述", type: "textarea", required: true, priority: "recommended", placeholder: "例如：主动咨询-我想买个保险，你帮我看看 / 非主动咨询-聊到孩子教育，客户说想送孩子出国读书" },
      { key: "pastInteraction", label: "历史互动摘要", type: "textarea", priority: "optional", placeholder: "例如：之前买过医疗险，参加过去年答谢会，朋友圈互动较多" },
    ],
  },
  {
    title: "当前卡点",
    fields: [
      { key: "clientObjection", label: "客户提出的异议或卡点原话", type: "textarea", priority: "recommended", placeholder: "例如：我再考虑考虑 / 太贵了 / 回去跟家里人商量下" },
      { key: "agentResponse", label: "代理人当时的回应方式简述", type: "textarea", priority: "recommended", placeholder: "例如：我介绍了产品的保障范围 / 我没有直接回应，转移了话题" },
    ],
  },
];

const radioLabels: Record<string, string> = {
  male: "男",
  female: "女",
};

function getRequiredFields(): (keyof KYCFormData)[] {
  return sections.flatMap((s) => s.fields.filter((f) => f.required).map((f) => f.key));
}

function FieldRenderer({ field, value, onChange }: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;
  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 hover:bg-white transition-colors";

  switch (field.type) {
    case "text":
    case "number":
      return (
        <input
          id={id}
          type={field.type}
          inputMode={field.type === "number" ? "numeric" : undefined}
          min={field.type === "number" ? 0 : undefined}
          max={field.type === "number" && field.key === "age" ? 120 : undefined}
          className={inputClass}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "radio":
      return (
        <div className="flex flex-wrap gap-3">
          {field.options!.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-brand-50 has-[:checked]:bg-brand-50 has-[:checked]:border-brand-300 has-[:checked]:text-brand-700 transition-colors text-sm">
              <input
                type="radio"
                name={field.key}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              {radioLabels[opt] ?? opt}
            </label>
          ))}
        </div>
      );

    case "select":
      return (
        <select
          id={id}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">请选择</option>
          {field.options!.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "textarea":
      return (
        <textarea
          id={id}
          className={`${inputClass} h-24 resize-none`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return null;
  }
}

function priorityTag(p?: string) {
  if (p === "optional") {
    return <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-400 font-normal">可选</span>;
  }
  return <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-500 font-normal">建议填写</span>;
}

function getPriority(f: FieldConfig) {
  return f.priority ?? (f.required ? "recommended" : "optional");
}

function FieldRow({ field, value, onChange, onArrayToggle, formData }: {
  field: FieldConfig;
  value: string;
  onChange: (key: keyof KYCFormData, value: string) => void;
  onArrayToggle: (field: ArrayField, value: string) => void;
  formData: KYCFormData;
}) {
  return (
    <div>
      <label htmlFor={`field-${field.key}`} className="block text-sm font-medium text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
        {priorityTag(getPriority(field))}
      </label>
      {field.type === "checkbox-group" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {field.options!.map((opt) => (
              <label key={opt} className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl cursor-pointer transition-colors text-sm
                ${(formData[field.key] as string[]).includes(opt)
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}
              >
                <input
                  type="checkbox"
                  checked={(formData[field.key] as string[]).includes(opt)}
                  onChange={() => onArrayToggle(field.key as ArrayField, opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            ))}
          </div>
          {field.key === "incomeSources" && (formData.incomeSources as string[]).includes("其他") && (
            <input
              type="text"
              className="w-full px-3.5 py-2.5 mt-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 hover:bg-white transition-colors text-sm"
              placeholder="请说明其他收入来源"
              value={formData.incomeSourcesOther}
              onChange={(e) => onChange("incomeSourcesOther", e.target.value)}
            />
          )}
        </>
      ) : (
        <FieldRenderer field={field} value={value} onChange={(v) => onChange(field.key, v)} />
      )}
    </div>
  );
}

function StepForm({ section, step, formData, expandedSections, onToggleExpand, onFieldChange, onArrayToggle }: {
  section: SectionConfig;
  step: number;
  formData: KYCFormData;
  expandedSections: Set<number>;
  onToggleExpand: (step: number) => void;
  onFieldChange: (key: keyof KYCFormData, value: string) => void;
  onArrayToggle: (field: ArrayField, value: string) => void;
}) {
  const sorted = [...section.fields].sort((a, b) => {
    const pa = getPriority(a);
    const pb = getPriority(b);
    return pa === "optional" && pb !== "optional" ? 1 : pa !== "optional" && pb === "optional" ? -1 : 0;
  });
  const dividerIdx = sorted.findIndex((f) => getPriority(f) === "optional");
  const hasOptional = dividerIdx >= 0;
  const recommended = hasOptional ? sorted.slice(0, dividerIdx) : sorted;
  const optional = hasOptional ? sorted.slice(dividerIdx) : [];
  const collapsible = hasOptional && step <= 2;
  const expanded = expandedSections.has(step);

  return (
    <div className="space-y-5">
      {recommended.map((field) => (
        <FieldRow key={field.key} field={field} value={formData[field.key] as string}
          onChange={onFieldChange} onArrayToggle={onArrayToggle} formData={formData} />
      ))}

      {optional.length > 0 && (collapsible ? (
        <>
          <button
            type="button"
            onClick={() => onToggleExpand(step)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            <span>{expanded ? "收起 ▲" : "展开更多细节 ▼"}</span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="space-y-5 pt-1">
              {optional.map((field) => (
                <FieldRow key={field.key} field={field} value={formData[field.key] as string}
                  onChange={onFieldChange} onArrayToggle={onArrayToggle} formData={formData} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="pt-2 border-t border-gray-100 space-y-4">
          {optional.map((field) => (
            <FieldRow key={field.key} field={field} value={formData[field.key] as string}
              onChange={onFieldChange} onArrayToggle={onArrayToggle} formData={formData} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function KYCWizard({ onSubmit, isLoading, clientRefreshKey, initialClientId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<KYCFormData>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  // 加载客户列表
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.ok ? r.json() : [])
      .then(setClients)
      .catch((err) => { console.error("[KYCWizard] clients load error:", err); })
      .finally(() => setClientsLoading(false));
  }, [clientRefreshKey]);

  // 草稿恢复
  useEffect(() => {
    if (authLoading || !user) return;
    const key = getDraftKey(user.userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        if (draft && Object.keys(draft).length > 0) {
          const ok = confirm("检测到未完成的表单草稿，是否恢复？");
          if (ok) {
            setFormData({ ...EMPTY_FORM, ...draft });
          } else {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }, [authLoading, user]);

  // 保存草稿
  const saveDraft = useCallback((data: KYCFormData) => {
    if (!user) return;
    localStorage.setItem(getDraftKey(user.userId), JSON.stringify(data));
  }, [user]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [step]);

  const handleFieldChange = (key: keyof KYCFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      try { saveDraft(next); } catch { /* 静默失败 */ }
      return next;
    });
  };

  const handleArrayFieldToggle = (field: ArrayField, value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const updated = { ...prev, [field]: next };
      try { saveDraft(updated); } catch { /* 静默失败 */ }
      return updated;
    });
  };

  const changeStep = (newStep: number) => {
    try { saveDraft(formData); } catch { /* localStorage 不可用时静默失败 */ }
    setStep(newStep);
  };

  const handleSelectClient = async (clientIdStr: string) => {
    if (!clientIdStr) {
      setSelectedClientId(null);
      setFormData(EMPTY_FORM);
      setStep(0);
      return;
    }
    const id = Number(clientIdStr);
    setSelectedClientId(id);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const client = await res.json();
        if (client.kyc_snapshot) {
          const snapshot = typeof client.kyc_snapshot === "string"
            ? JSON.parse(client.kyc_snapshot)
            : client.kyc_snapshot;
          setFormData({ ...EMPTY_FORM, ...snapshot });
        }
      }
    } catch {
      console.error("[KYCWizard] failed to load client snapshot");
    }
  };

  // 从 URL 参数自动选中客户
  useEffect(() => {
    if (initialClientId) {
      handleSelectClient(String(initialClientId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = getRequiredFields();
    const missing = requiredFields.find((key) => {
      const val = formData[key];
      if (Array.isArray(val)) return val.length === 0;
      return !val;
    });
    if (missing) {
      const sectionIdx = sections.findIndex((s) => s.fields.some((f) => f.key === missing));
      if (sectionIdx >= 0) {
        setStep(sectionIdx);
        alert("请填写所有必填字段");
      }
      return;
    }
    // 清除草稿
    if (user) localStorage.removeItem(getDraftKey(user.userId));
    onSubmit(formData, selectedClientId);
  };

  const section = sections[step];
  const isFirst = step === 0;
  const isLast = step === sections.length - 1;

  const filledCount = sections.filter((s) =>
    s.fields.some((f) => {
      const val = formData[f.key];
      if (f.required) {
        if (Array.isArray(val)) return val.length > 0;
        return !!val;
      }
      return false;
    })
  ).length;

  return (
    <div className="h-full bg-white flex flex-col">
      {/* 顶部区域 */}
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-2 shrink-0">
        <h2 className="text-base font-semibold text-gray-800 mb-3">客户档案区 (KYC)</h2>

        {/* 客户选择 */}
        <div className="relative">
          <select
            className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm appearance-none cursor-pointer"
            value={selectedClientId ?? ""}
            onChange={(e) => handleSelectClient(e.target.value)}
            disabled={clientsLoading}
          >
            <option value="">+ 新建客户</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {selectedClientId && (
            <p className="text-xs text-brand-500 mt-1.5 ml-1">已加载该客户的档案数据</p>
          )}
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="px-4 md:px-6 pb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {sections.map((s, i) => (
            <div key={s.title} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => changeStep(i)}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold transition-all shrink-0
                  ${i < step ? "bg-green-500 text-white shadow-sm" :
                    i === step ? "bg-brand-600 text-white shadow-md ring-2 ring-brand-200" :
                    "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                title={s.title}
              >
                {i < step ? "✓" : i + 1}
              </button>
              {i < sections.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 font-medium">{section.title}</p>
          <p className="text-[11px] text-gray-400">已完成 {filledCount}/{sections.length} 个板块</p>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-100" />

      {/* 当前步骤表单 */}
      <StepForm
        section={section}
        step={step}
        formData={formData}
        expandedSections={expandedSections}
        onToggleExpand={(s) => setExpandedSections((prev) => {
          const next = new Set(prev);
          if (next.has(s)) next.delete(s);
          else next.add(s);
          return next;
        })}
        onFieldChange={handleFieldChange}
        onArrayToggle={handleArrayFieldToggle}
      />

      {/* 导航按钮 */}
      <div className="px-4 md:px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
        {!isFirst && (
          <button
            type="button"
            onClick={() => changeStep(step - 1)}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            上一步
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={() => changeStep(step + 1)}
            className="ml-auto px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all hover:shadow-md active:scale-[0.98]"
          >
            下一步
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="ml-auto px-8 py-2.5 bg-brand-gradient text-white font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 text-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                教练诊断中...
              </span>
            ) : (
              "提交给保险教练诊断"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
