"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

interface ClientSummary {
  id: number;
  name: string;
  updated_at: string;
}

interface ClientDetail {
  id: number;
  name: string;
  kyc_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  conversations: { id: number; title: string; created_at: string }[];
}

const INDUSTRY_OPTIONS = [
  "互联网/IT/通信", "金融/保险/证券", "教育/培训", "医疗/健康/医药",
  "制造业", "汽车/机械", "房地产/建筑/装修", "零售/电商/贸易",
  "餐饮/旅游/酒店", "政府/事业单位/公务员", "能源/电力/采矿/化工",
  "物流/运输/交通", "文化/传媒/广告", "体育/健身/娱乐",
  "农业/林业/渔业", "法律/咨询/审计", "科研/技术服务",
  "家政/居民服务", "水利/环境/公共设施", "其他",
];

// 按 KYC 向导的分组展示
interface KycSection {
  title: string;
  fields: { key: string; label: string; type: "text" | "select" | "radio" | "textarea"; options?: string[] }[];
}

const KYC_DISPLAY_SECTIONS: KycSection[] = [
  {
    title: "客户画像与生活状态",
    fields: [
      { key: "clientName", label: "名称", type: "text" },
      { key: "gender", label: "性别", type: "radio", options: ["male", "female"] },
      { key: "age", label: "年龄", type: "text" },
      { key: "city", label: "所在城市", type: "text" },
      { key: "maritalStatus", label: "婚姻", type: "radio", options: ["未婚", "已婚", "离异", "丧偶", "再婚"] },
      { key: "healthCondition", label: "身体情况", type: "textarea" },
      { key: "childrenDetail", label: "子女详情", type: "textarea" },
      { key: "parentsDetail", label: "父母情况", type: "textarea" },
      { key: "personality", label: "性格特征", type: "textarea" },
      { key: "hobbies", label: "兴趣爱好", type: "textarea" },
      { key: "step1Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "工作与收支",
    fields: [
      { key: "clientIndustry", label: "行业", type: "select", options: INDUSTRY_OPTIONS },
      { key: "clientCompany", label: "公司", type: "text" },
      { key: "clientPosition", label: "职责&职位", type: "text" },
      { key: "careerDevelopment", label: "职业发展", type: "select", options: ["稳定或上升期", "瓶颈期或面临裁员", "创业或自雇，生意波动较大", "已退休或全职家庭"] },
      { key: "breadwinner", label: "经济支柱", type: "select", options: ["客户本人", "配偶", "夫妻共同", "父母"] },
      { key: "spouseIndustry", label: "配偶行业", type: "select", options: INDUSTRY_OPTIONS },
      { key: "spouseCompany", label: "配偶公司", type: "text" },
      { key: "spousePosition", label: "配偶职责&职位", type: "text" },
      { key: "annualIncome", label: "家庭年收入（万）", type: "text" },
      { key: "monthlyExpense", label: "月度固定支出（万）", type: "text" },
      { key: "majorExpensePlan", label: "未来大额支出", type: "textarea" },
      { key: "step2Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "资产情况",
    fields: [
      { key: "fixedAssets", label: "固定资产", type: "textarea" },
      { key: "liquidAssets", label: "流动资产（万）", type: "text" },
      { key: "liabilities", label: "负债情况", type: "textarea" },
      { key: "investmentAmount", label: "投资金额（万）", type: "text" },
      { key: "investmentStyle", label: "投资偏好", type: "select", options: ["保守型（存款为主）", "稳健型（基金理财为主）", "进取型（股票/股权为主）"] },
      { key: "riskTolerance", label: "风险承受能力", type: "select", options: ["低（不愿承担本金损失）", "中（可接受小幅波动）", "高（追求高收益）"] },
      { key: "expensePressure", label: "支出压力", type: "select", options: ["无明显经济压力", "有房贷或房租压力", "子女教育开销较大", "日常消费高难以存下钱"] },
      { key: "step3Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "已有保障",
    fields: [
      { key: "protectionInsurance", label: "保障类保险", type: "textarea" },
      { key: "savingsInsurance", label: "储蓄类保险", type: "textarea" },
      { key: "insuranceAttitude", label: "对保险的态度", type: "select", options: ["满意，配置比较全面", "买了但不太清楚保障内容", "觉得保额不够想补充", "没买过商业保险", "对保险持怀疑或排斥态度"] },
      { key: "otherInsurance", label: "其他保险", type: "text" },
      { key: "step4Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "面谈入口",
    fields: [
      { key: "triggerScenario", label: "触发场景", type: "select", options: ["客户主动咨询（有明确原话）", "非主动咨询（代理人通过社交激活话题）"] },
      { key: "clientOriginalWords", label: "客户原话或背景描述", type: "textarea" },
      { key: "pastInteraction", label: "历史互动摘要", type: "textarea" },
    ],
  },
  {
    title: "当前卡点",
    fields: [
      { key: "clientObjection", label: "客户异议/卡点", type: "textarea" },
      { key: "agentResponse", label: "代理人回应", type: "textarea" },
    ],
  },
];

function formatKycValue(key: string, val: unknown): string {
  if (Array.isArray(val)) return val.join("、") || "";
  if (val === "" || val === null || val === undefined) return "";
  if (key === "gender") return val === "male" ? "男" : val === "female" ? "女" : String(val);
  if (key === "triggerScenario") {
    return val === "客户主动咨询（有明确原话）" ? "客户主动咨询" : "非主动咨询";
  }
  return String(val);
}

function sectionHasData(kyc: Record<string, unknown>, section: KycSection): boolean {
  return section.fields.some((f) => {
    const v = kyc[f.key];
    return v !== "" && v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0);
  });
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } catch {
      console.error("[ClientsPage] fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const viewClient = async (id: number) => {
    setDetailLoading(true);
    setEditMode(false);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.kyc_snapshot || typeof data.kyc_snapshot !== "object" || Array.isArray(data.kyc_snapshot)) {
          data.kyc_snapshot = {};
        }
        setSelected(data);
        setNewName(data.name);
        setCollapsedSections(new Set());
        // 构建编辑用的扁平字符串数据
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.kyc_snapshot as Record<string, unknown>)) {
          flat[k] = formatKycValue(k, v);
        }
        setEditData(flat);
      }
    } catch {
      console.error("[ClientsPage] viewClient failed");
    } finally {
      setDetailLoading(false);
    }
  };

  const saveName = async () => {
    if (!selected || !newName.trim()) return;
    try {
      await fetch(`/api/clients/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setSelected({ ...selected, name: newName.trim() });
      setClients((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, name: newName.trim() } : c))
      );
      setEditingName(false);
    } catch {
      console.error("[ClientsPage] saveName failed");
    }
  };

  const enterEditMode = () => {
    if (!selected) return;
    const flat: Record<string, string> = {};
    for (const section of KYC_DISPLAY_SECTIONS) {
      for (const f of section.fields) {
        const v = selected.kyc_snapshot[f.key];
        flat[f.key] = Array.isArray(v) ? (v as string[]).join("、") : (v !== null && v !== undefined ? String(v) : "");
      }
    }
    setEditData(flat);
    setCollapsedSections(new Set());
    setEditMode(true);
  };

  const saveKyc = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // 将编辑数据转回 kyc_snapshot 格式
      const kycSnapshot: Record<string, unknown> = { ...selected.kyc_snapshot };
      for (const section of KYC_DISPLAY_SECTIONS) {
        for (const f of section.fields) {
          kycSnapshot[f.key] = editData[f.key] ?? "";
        }
      }
      const res = await fetch(`/api/clients/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kycSnapshot }),
      });
      if (!res.ok) throw new Error("保存失败");
      setSelected({ ...selected, kyc_snapshot: kycSnapshot, updated_at: new Date().toISOString() });
      setEditMode(false);
    } catch (e) {
      console.error("[ClientsPage] saveKyc failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${selected.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setSelected(null);
      fetchClients();
    } catch {
      console.error("[ClientsPage] deleteClient failed");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const inputClass = "w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white";

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-800">客户清单</h2>
          <p className="text-xs text-gray-400 mt-0.5">管理客户档案与跟进进度</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-brand-gradient text-white rounded-xl text-sm font-medium transition-all hover:shadow-md active:scale-[0.98]"
        >
          返回首页
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        {/* 左侧：客户列表 */}
        <div className="md:w-64 shrink-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-5 w-5 text-gray-300" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-400">暂无客户</p>
              <p className="text-xs text-gray-300 mt-1">提交诊断后自动创建</p>
            </div>
          ) : (
            <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => viewClient(c.id)}
                  className={`shrink-0 w-40 md:w-full text-left p-3.5 rounded-xl transition-all border ${
                    selected?.id === c.id
                      ? "bg-brand-50 border-brand-200 shadow-sm"
                      : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{c.updated_at}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：客户详情 */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-sm text-gray-400">选择左侧客户查看详情</p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-5 w-5 text-gray-300" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* 头部操作栏 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-44 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveName()}
                        autoFocus
                      />
                      <button onClick={saveName} className="text-sm font-medium text-brand-600">保存</button>
                      <button onClick={() => { setEditingName(false); setNewName(selected.name); }} className="text-sm text-gray-400">取消</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-800">{selected.name}</h3>
                      <button onClick={() => setEditingName(true)} className="text-gray-300 hover:text-brand-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={saveKyc}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs font-medium bg-brand-gradient text-white rounded-lg transition-all hover:shadow-md disabled:opacity-60"
                      >
                        {saving ? "保存中..." : "保存档案"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={enterEditMode}
                        className="px-4 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        编辑档案
                      </button>
                      <button
                        onClick={() => {
                          sessionStorage.setItem("kyc_bootstrap_" + selected.id, JSON.stringify(selected.kyc_snapshot));
                          router.push("/?clientId=" + selected.id);
                        }}
                        className="px-4 py-1.5 text-xs font-medium bg-brand-gradient text-white rounded-lg transition-all hover:shadow-md active:scale-[0.98]"
                      >
                        继续诊断此客户
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deleting}
                        className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting ? "删除中..." : "删除客户"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* KYC 分模块展示 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                {KYC_DISPLAY_SECTIONS.map((section, sectionIdx) => {
                  const hasData = sectionHasData(selected.kyc_snapshot, section);
                  const collapsed = collapsedSections.has(sectionIdx);
                  return (
                    <div key={section.title} className="mb-5 last:mb-0">
                      <button
                        type="button"
                        onClick={() => setCollapsedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(sectionIdx)) next.delete(sectionIdx);
                          else next.add(sectionIdx);
                          return next;
                        })}
                        className="w-full flex items-center gap-2 mb-2 text-left"
                      >
                        <svg
                          className={`w-3 h-3 text-gray-400 transition-transform ${!collapsed ? "rotate-90" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <h4 className="text-sm font-semibold text-gray-700">{section.title}</h4>
                        {!hasData && !editMode && (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </button>
                      {!collapsed && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-2.5 ml-5 pl-3 border-l-2 border-gray-100">
                          {section.fields.map((f) => {
                            const rawVal = selected.kyc_snapshot[f.key];
                            const displayVal = formatKycValue(f.key, rawVal);
                            // 浏览模式下隐藏空值
                            if (!editMode && !displayVal) return null;

                            return (
                              <div key={f.key} className="text-sm">
                                <span className="text-gray-400 text-[11px]">{f.label}</span>
                                {editMode ? (
                                  f.type === "textarea" ? (
                                    <textarea
                                      className={`${inputClass} h-16 resize-none mt-0.5`}
                                      value={editData[f.key] ?? ""}
                                      onChange={(e) => setEditData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                    />
                                  ) : f.type === "select" ? (
                                    <select
                                      className={`${inputClass} mt-0.5`}
                                      value={editData[f.key] ?? ""}
                                      onChange={(e) => setEditData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                    >
                                      <option value="">请选择</option>
                                      {f.options?.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : f.type === "radio" ? (
                                    <div className="flex flex-wrap gap-2 mt-0.5">
                                      {f.options?.map((opt) => (
                                        <label key={opt} className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
                                          editData[f.key] === opt
                                            ? "bg-brand-50 border-brand-300 text-brand-700"
                                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                        }`}>
                                          <input
                                            type="radio"
                                            name={`edit_${f.key}`}
                                            value={opt}
                                            checked={editData[f.key] === opt}
                                            onChange={(e) => setEditData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                            className="sr-only"
                                          />
                                          {f.key === "gender" ? (opt === "male" ? "男" : "女") : opt}
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <input
                                      className={`${inputClass} mt-0.5`}
                                      value={editData[f.key] ?? ""}
                                      onChange={(e) => setEditData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                    />
                                  )
                                ) : (
                                  <p className="text-gray-700 text-xs mt-0.5">{displayVal}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-gray-300 mt-4">
                创建于 {selected.created_at} · 更新于 {selected.updated_at}
              </p>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          message="确定要删除此客户吗？关联的对话记录将保留但不再归属任何客户。"
          confirmLabel="删除"
          danger
          onConfirm={deleteClient}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </main>
  );
}
