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
  clientName: "", age: "", gender: "", city: "", maritalStatus: "", childrenCount: "", childrenDetail: "",
  clientIndustry: "", clientPosition: "", clientWorkYears: "", spouseIndustry: "", spousePosition: "", careerStatus: "",
  incomeSources: [], assets: [], expensePressure: "", annualIncome: "", stockAmount: "", savingsAmount: "",
  medicalInsurance: "", criticalIllnessInsurance: "", accidentInsurance: "", termLifeInsurance: "", annuityInsurance: "", increasingLifeInsurance: "", otherInsurance: "", insuranceAttitude: "",
  triggerScenario: "", clientOriginalWords: "",
  clientObjection: "", agentResponse: "",
  pastInteraction: "", recentChanges: "",
};

function getDraftKey(userId: number): string {
  return `kyc_draft_${userId}`;
}

const sections: SectionConfig[] = [
  {
    title: "客户画像",
    fields: [
      { key: "clientName", label: "客户名称", type: "text", required: true, placeholder: "例如：张先生、李姐、王总" },
      { key: "age", label: "年龄", type: "number", required: true, placeholder: "请输入年龄" },
      { key: "gender", label: "性别", type: "radio", required: true, options: ["male", "female"] },
      { key: "city", label: "所在城市", type: "text", required: true, placeholder: "例如：上海" },
      { key: "maritalStatus", label: "婚姻状况", type: "radio", required: true, options: ["未婚", "已婚", "离异", "丧偶"] },
      { key: "childrenCount", label: "子女数量", type: "number", required: true, placeholder: "无则填0" },
      { key: "childrenDetail", label: "子女详情", type: "text", placeholder: "例如：儿子/8岁/公立小学；女儿/3岁/未入学" },
      { key: "recentChanges", label: "近一年重大变化", type: "text", placeholder: "例如：换工作、搬家北京到上海、刚生了二胎、父亲去年生病住院" },
    ],
  },
  {
    title: "职业与经济",
    fields: [
      { key: "clientIndustry", label: "客户职业-行业", type: "text", required: true, placeholder: "例如：互联网、教育、医疗、制造业、个体经营" },
      { key: "clientPosition", label: "客户职业-职位", type: "text", placeholder: "例如：中层管理、技术专家、企业主" },
      { key: "clientWorkYears", label: "客户职业-从业年限", type: "number", placeholder: "单位：年" },
      { key: "spouseIndustry", label: "配偶职业-行业", type: "text", placeholder: "例如：互联网、教育、医疗、制造业、个体经营" },
      { key: "spousePosition", label: "配偶职业-职位", type: "text", placeholder: "例如：中层管理、技术专家、企业主" },
      { key: "careerStatus", label: "职业状态感知", type: "select", required: true, options: ["稳定或上升期", "瓶颈期或面临裁员", "创业或自雇，生意波动较大", "已退休或全职家庭"] },
    ],
  },
  {
    title: "家庭财务",
    fields: [
      { key: "incomeSources", label: "主要收入来源", type: "checkbox-group", options: ["工资收入", "经营收入", "房租收入", "投资分红", "其他"] },
      { key: "assets", label: "资产感知", type: "checkbox-group", options: ["有自住房", "有投资房", "有一定积蓄", "有基金或股票等投资", "有企业股权"] },
      { key: "annualIncome", label: "家庭年收入（万元）", type: "number", placeholder: "例如：30（填大概数字即可）" },
      { key: "stockAmount", label: "股市/基金投入（万元）", type: "number", placeholder: "例如：20（填大概数字即可）" },
      { key: "savingsAmount", label: "现有积蓄（万元）", type: "number", placeholder: "例如：50（填大概数字即可）" },
      { key: "expensePressure", label: "支出压力感知", type: "select", options: ["无明显经济压力", "有房贷或房租压力", "子女教育开销较大", "日常消费高难以存下钱"] },
    ],
  },
  {
    title: "已有保障",
    fields: [
      { key: "medicalInsurance", label: "医疗险", type: "text", placeholder: "例如：有，百万医疗，年交500元 / 无" },
      { key: "criticalIllnessInsurance", label: "重疾险", type: "text", placeholder: "例如：有，50万保额，终身含身故，年交8000元 / 无" },
      { key: "accidentInsurance", label: "意外险", type: "text", placeholder: "例如：有，100万保额，年交300元 / 无" },
      { key: "termLifeInsurance", label: "定期寿险", type: "text", placeholder: "例如：有，200万保额，保至60岁，年交2000元 / 无" },
      { key: "annuityInsurance", label: "年金险", type: "text", placeholder: "例如：有，养老年金，年交5万交10年，60岁起领 / 无" },
      { key: "increasingLifeInsurance", label: "增额终身寿险", type: "text", placeholder: "例如：有，年交10万交5年，已交完 / 无" },
      { key: "otherInsurance", label: "其他保险", type: "text", placeholder: "例如：有，企业团体险 / 有，惠民保 / 无" },
      { key: "insuranceAttitude", label: "对已购保险的整体态度", type: "select", options: ["满意，配置比较全面", "买了但不太清楚保障内容", "觉得保额不够想补充", "没买过商业保险", "对保险持怀疑或排斥态度"] },
    ],
  },
  {
    title: "面谈入口",
    fields: [
      { key: "triggerScenario", label: "触发场景", type: "select", required: true, options: ["客户主动咨询（有明确原话）", "非主动咨询（代理人通过社交激活话题）"] },
      { key: "clientOriginalWords", label: "客户原话或背景描述", type: "textarea", required: true, placeholder: "例如：主动咨询-我想买个保险，你帮我看看 / 非主动咨询-聊到孩子教育，客户说想送孩子出国读书" },
      { key: "pastInteraction", label: "历史互动摘要", type: "textarea", placeholder: "例如：之前买过医疗险，参加过去年答谢会，朋友圈互动较多" },
    ],
  },
  {
    title: "当前卡点",
    fields: [
      { key: "clientObjection", label: "客户提出的异议或卡点原话", type: "textarea", placeholder: "例如：我再考虑考虑 / 太贵了 / 回去跟家里人商量下" },
      { key: "agentResponse", label: "代理人当时的回应方式简述", type: "textarea", placeholder: "例如：我介绍了产品的保障范围 / 我没有直接回应，转移了话题" },
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

export default function KYCWizard({ onSubmit, isLoading, clientRefreshKey, initialClientId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<KYCFormData>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
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
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="space-y-5">
          {section.fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`field-${field.key}`} className="block text-sm font-medium text-gray-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>

              {field.type === "checkbox-group" ? (
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
                        onChange={() => handleArrayFieldToggle(field.key as ArrayField, opt)}
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <FieldRenderer
                  field={field}
                  value={formData[field.key] as string}
                  onChange={(value) => handleFieldChange(field.key, value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

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
