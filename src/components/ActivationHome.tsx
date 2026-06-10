"use client";

import { useRouter } from "next/navigation";
import TodayTaskList from "@/components/TodayTaskList";

const ENTRY_PATHS = [
  {
    title: "我现在有个客户需要帮助",
    label: "客户帮助",
    description: "直接讲客户背景、客户原话和你卡住的地方。助手会先补问关键问题，再给当前判断和下一步表达。",
    href: "/assistant?mode=client_quick_help",
    primary: true,
  },
  {
    title: "帮我建立个人经营系统",
    label: "个人蓝图",
    description: "用几分钟介绍自己、资源、目标和困难。助手会整理定位假设、内容方向和未来 7 天行动。",
    href: "/assistant?mode=agent_blueprint",
    primary: false,
  },
];

const QUICK_LINKS = [
  { label: "客户", href: "/clients" },
  { label: "助手", href: "/assistant" },
  { label: "我的", href: "/mine" },
];

export default function ActivationHome() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="min-h-full bg-gray-50">
      <section className="border-b border-gray-100 bg-white px-4 py-5 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-brand-600">{today}</p>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-950 tracking-normal">
                保险代理人的个人 AI 助手
              </h1>
              <p className="mt-3 text-sm md:text-base leading-7 text-gray-600">
                先帮你处理一个真实客户问题，或先建立适合你的经营蓝图。助手会把客户经营、内容定位、复盘和提醒统一到同一个工作流里。
              </p>
            </div>
            <div className="flex items-center gap-2 md:pt-1">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => router.push(link.href)}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-6">
            {ENTRY_PATHS.map((entry) => (
              <button
                key={entry.href}
                type="button"
                onClick={() => router.push(entry.href)}
                className={`text-left rounded-xl border p-5 shadow-sm transition-all ${
                  entry.primary
                    ? "border-brand-200 bg-brand-50 hover:border-brand-300"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${
                    entry.primary
                      ? "bg-white text-brand-700"
                      : "bg-white text-gray-500"
                  }`}
                >
                  {entry.label}
                </span>
                <h2 className="mt-4 text-lg font-semibold text-gray-950">{entry.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{entry.description}</p>
                <span className="mt-4 inline-flex text-sm font-medium text-brand-700">
                  开始
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-5 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">今日行动</h2>
              <p className="mt-1 text-xs text-gray-400">
                完成客户帮助或个人蓝图后，这里会沉淀明确事项和建议跟进。
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/assistant?mode=daily_review")}
              className="hidden sm:inline-flex px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              日复盘
            </button>
          </div>
          <TodayTaskList />
        </div>
      </section>
    </main>
  );
}
