"use client";

import { useAuth } from "@/components/UserProvider";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const logout = async () => {
    if (!confirm("确定退出登录吗？")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0">
      <button onClick={() => router.push("/")} className="flex items-center gap-3 text-left">
        <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm md:text-base font-bold text-gray-900">保险 AI 助手</h1>
          <p className="hidden sm:block text-[10px] text-gray-400">个人客户经营工作台</p>
        </div>
      </button>

      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
        <button
          onClick={() => router.push("/clients")}
          className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          客户
        </button>

        <button
          onClick={() => router.push("/assistant")}
          className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          助手
        </button>

        <button
          onClick={() => router.push("/mine")}
          className="hidden sm:inline px-2.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          我的
        </button>

        <button
          onClick={() => router.push("/points")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="text-gray-500">额度</span>
          <span className="font-semibold text-gray-700">{loading ? "..." : user?.balance ?? 0}</span>
        </button>

        <span className="hidden sm:inline text-xs text-gray-400">
          {user?.phone ? `尾号 ${user.phone.slice(-4)}` : ""}
        </span>

        <button
          onClick={logout}
          className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5"
        >
          退出
        </button>
      </div>
    </header>
  );
}
