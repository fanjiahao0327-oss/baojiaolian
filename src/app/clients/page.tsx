"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function kycFieldLabel(key: string): string {
  const map: Record<string, string> = {
    clientName: "姓名", age: "年龄", gender: "性别", city: "工作&居住城市",
    healthCondition: "身体情况", maritalStatus: "婚姻", childrenDetail: "子女详情",
    parentsDetail: "父母情况", personality: "性格特征", hobbies: "兴趣爱好",
    step1Notes: "补充信息",
    clientIndustry: "行业&公司", clientPosition: "职责&职位",
    careerDevelopment: "职业发展", breadwinner: "经济支柱",
    spouseIndustry: "配偶行业&公司", spousePosition: "配偶职责&职位",
    incomeSources: "收入来源", incomeSourcesOther: "收入来源-其他", annualIncome: "家庭年收入(万)",
    monthlyExpense: "月度固定支出(万)", majorExpensePlan: "未来大额支出",
    step2Notes: "补充信息",
    fixedAssets: "固定资产", liquidAssets: "流动资产(万)", investmentAmount: "投资金额(万)",
    investmentStyle: "投资偏好", riskTolerance: "风险承受能力",
    liabilities: "负债情况", expensePressure: "支出压力",
    step3Notes: "补充信息",
    protectionInsurance: "保障类保险", savingsInsurance: "储蓄类保险",
    otherInsurance: "其他保险", insuranceAttitude: "对保险的态度",
    step4Notes: "补充信息",
    triggerScenario: "触发场景",
  };
  return map[key] || key;
}

function formatKycValue(key: string, val: unknown): string {
  if (Array.isArray(val)) return val.join("、") || "—";
  if (val === "" || val === null || val === undefined) return "—";
  if (key === "gender") return val === "male" ? "男" : val === "female" ? "女" : String(val);
  return String(val);
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

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
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.kyc_snapshot || typeof data.kyc_snapshot !== "object" || Array.isArray(data.kyc_snapshot)) {
          data.kyc_snapshot = {};
        }
        setSelected(data);
        setNewName(data.name);
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

  const kycFields = selected?.kyc_snapshot
    ? Object.entries(selected.kyc_snapshot).filter(
        ([k]) => !["incomeSources"].includes(k)
      )
    : [];

  const arrayFields = selected?.kyc_snapshot
    ? (["incomeSources"] as const).filter(
        (k) => selected.kyc_snapshot[k]
      )
    : [];

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
              {/* 基本信息卡片 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
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
                  <button
                    onClick={() => router.push("/?clientId=" + selected.id)}
                    className="px-4 py-1.5 text-xs font-medium bg-brand-gradient text-white rounded-lg transition-all hover:shadow-md active:scale-[0.98]"
                  >
                    继续诊断此客户
                  </button>
                </div>

                {/* KYC 字段网格 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-2.5">
                  {kycFields.map(([key, val]) => (
                    <div key={key} className="text-sm">
                      <span className="text-gray-400 text-xs">{kycFieldLabel(key)}：</span>
                      <span className="text-gray-700">{formatKycValue(key, val)}</span>
                    </div>
                  ))}
                </div>

                {/* 数组字段 */}
                {arrayFields.map((key) => (
                  <div key={key} className="text-sm mt-3 pt-3 border-t border-gray-50">
                    <span className="text-gray-400 text-xs">
                      {key === "incomeSources" ? "收入来源" : "资产感知"}：
                    </span>
                    <span className="text-gray-700">
                      {formatKycValue(key, selected.kyc_snapshot[key])}
                    </span>
                  </div>
                ))}

                <p className="text-[10px] text-gray-300 mt-4">
                  创建于 {selected.created_at} · 更新于 {selected.updated_at}
                </p>
              </div>

              {/* 对话记录 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">关联对话</h4>
                {selected.conversations.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无对话记录</p>
                ) : (
                  <div className="space-y-2">
                    {selected.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between text-sm py-2.5 px-3 bg-gray-50 rounded-xl"
                      >
                        <span className="text-gray-700 truncate text-xs">{conv.title}</span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{conv.created_at}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
