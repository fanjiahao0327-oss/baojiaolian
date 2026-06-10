"use client";

import { useEffect, useState } from "react";
import type { AgentBlueprint, AgentProfileSnapshot } from "@/types";

const PROFILE_FIELDS: Array<{
  key: keyof AgentProfileSnapshot;
  label: string;
  placeholder: string;
}> = [
  { key: "basics", label: "基本情况", placeholder: "城市、渠道、入行时间、服务区域" },
  { key: "experience", label: "过往经历", placeholder: "学历、职业经历、专业资质" },
  { key: "strengths", label: "个人特点", placeholder: "性格、沟通方式、优势和短板" },
  { key: "customerResources", label: "客户资源", placeholder: "熟人、社群、转介绍、历史客户类型" },
  { key: "contentPreference", label: "内容偏好", placeholder: "是否出镜、擅长写作还是表达、喜欢的平台" },
  { key: "weeklyTimeBudget", label: "每周投入", placeholder: "每周可投入多少小时，固定可用时间段" },
  { key: "businessGoal", label: "当前目标", placeholder: "希望解决的经营问题和近期业务目标" },
  { key: "constraints", label: "限制条件", placeholder: "不想做什么、合规边界、资源限制" },
];

const EMPTY_PROFILE: AgentProfileSnapshot = {
  basics: "",
  experience: "",
  strengths: "",
  customerResources: "",
  contentPreference: "",
  weeklyTimeBudget: "",
  businessGoal: "",
  constraints: "",
};

export default function AgentProfilePanel() {
  const [profile, setProfile] = useState<AgentProfileSnapshot>(EMPTY_PROFILE);
  const [blueprint, setBlueprint] = useState<Partial<AgentBlueprint>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/agent-profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profileSnapshot) setProfile({ ...EMPTY_PROFILE, ...data.profileSnapshot });
        if (data?.blueprintSnapshot) setBlueprint(data.blueprintSnapshot);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (nextBlueprint = blueprint) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/agent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileSnapshot: profile, blueprintSnapshot: nextBlueprint }),
      });
      if (!res.ok) throw new Error("保存失败");
      setMessage("已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const generateBlueprint = async () => {
    setGenerating(true);
    setMessage("");
    try {
      const userInput = PROFILE_FIELDS
        .map((field) => `${field.label}：${profile[field.key] || "未填写"}`)
        .join("\n");
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "agent_blueprint", userInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      const nextBlueprint: Partial<AgentBlueprint> = {
        ...blueprint,
        selfUnderstanding: data.content || "",
        evidence: ["基于当前代理人画像生成"],
      };
      setBlueprint(nextBlueprint);
      await save(nextBlueprint);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-400">加载中</div>;
  }

  return (
    <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">个人经营画像</h2>
          {message && <p className="text-xs text-gray-400 mt-1">{message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || generating}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-50"
          >
            {saving ? "保存中" : "保存"}
          </button>
          <button
            type="button"
            onClick={generateBlueprint}
            disabled={saving || generating}
            className="px-3 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium disabled:opacity-50"
          >
            {generating ? "生成中" : "生成蓝图"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 p-4">
        {PROFILE_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="text-xs font-medium text-gray-500">{field.label}</span>
            <textarea
              value={profile[field.key]}
              onChange={(event) => setProfile((prev) => ({ ...prev, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              className="mt-1 w-full h-20 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </label>
        ))}
      </div>

      {blueprint.selfUnderstanding && (
        <div className="mx-4 mb-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
          <h3 className="text-sm font-semibold text-brand-800 mb-2">当前蓝图</h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {blueprint.selfUnderstanding}
          </p>
        </div>
      )}
    </section>
  );
}
