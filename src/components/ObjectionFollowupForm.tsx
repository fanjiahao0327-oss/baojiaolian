"use client";

import { useEffect, useState } from "react";
import type {
  ClientSummary,
  ObjectionFollowupData,
  ObjectionFollowupGoal,
  ObjectionFollowupScenario,
} from "@/types";
import { OBJECTION_GOAL_LABELS, OBJECTION_SCENARIO_LABELS } from "@/lib/objection-followup-options";

interface Props {
  isLoading: boolean;
  clientRefreshKey?: number;
  onSubmit: (data: ObjectionFollowupData, clientId: number | null) => void;
}

const EMPTY_FORM: ObjectionFollowupData = {
  customerWords: "",
  scenario: "after_meeting",
  agentReply: "",
  customerBackground: "",
  nextGoal: "wechat",
};

export default function ObjectionFollowupForm({ isLoading, clientRefreshKey, onSubmit }: Props) {
  const [form, setForm] = useState<ObjectionFollowupData>(EMPTY_FORM);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    setClientsLoading(true);
    fetch("/api/clients")
      .then((r) => r.ok ? r.json() : [])
      .then(setClients)
      .catch((err) => { console.error("[ObjectionFollowupForm] clients load error:", err); })
      .finally(() => setClientsLoading(false));
  }, [clientRefreshKey]);

  const update = (key: keyof ObjectionFollowupData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    const customerWords = form.customerWords.trim();
    if (!customerWords) {
      alert("请填写客户原话");
      return;
    }
    onSubmit({ ...form, customerWords }, selectedClientId);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-gray-100 shrink-0">
        <h2 className="text-base font-semibold text-gray-800">客户卡点跟进</h2>
        <p className="text-xs text-gray-400 mt-1">面谈后或跟进前，复盘客户卡点并准备下一次怎么说。</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            关联客户 <span className="text-gray-400 font-normal">可选</span>
          </label>
          <select
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm"
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
            disabled={clientsLoading}
          >
            <option value="">不关联客户</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            客户原话 <span className="text-red-400">*</span>
          </label>
          <textarea
            className="w-full h-28 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm resize-none"
            placeholder="例如：我再考虑一下 / 太贵了 / 我回去跟家人商量 / 别家收益更高"
            value={form.customerWords}
            onChange={(e) => update("customerWords", e.target.value)}
            maxLength={800}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">当时场景</label>
          <select
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm"
            value={form.scenario}
            onChange={(e) => update("scenario", e.target.value as ObjectionFollowupScenario)}
          >
            {Object.entries(OBJECTION_SCENARIO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            我的回应 <span className="text-gray-400 font-normal">可选</span>
          </label>
          <textarea
            className="w-full h-24 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm resize-none"
            placeholder="例如：我当时继续讲了产品收益，客户没有接话"
            value={form.agentReply || ""}
            onChange={(e) => update("agentReply", e.target.value)}
            maxLength={800}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            客户背景 <span className="text-gray-400 font-normal">可选</span>
          </label>
          <textarea
            className="w-full h-24 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50 text-sm resize-none"
            placeholder="例如：35岁，互联网从业，已有百万医疗，最近刚有二胎"
            value={form.customerBackground || ""}
            onChange={(e) => update("customerBackground", e.target.value)}
            maxLength={800}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">下一步想做什么</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(OBJECTION_GOAL_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update("nextGoal", value as ObjectionFollowupGoal)}
                className={`px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  form.nextGoal === value
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={submit}
          disabled={isLoading}
          className="w-full px-6 py-2.5 bg-brand-gradient text-white font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60 text-sm"
        >
          {isLoading ? "AI 正在分析卡点..." : "生成跟进建议"}
        </button>
      </div>
    </div>
  );
}
