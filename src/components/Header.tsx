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
          <h1 className="text-sm md:text-base font-bold text-gray-900">AI 保险教练</h1>
          <p className="hidden sm:block text-[10px] text-gray-400">保险代理人的幕后智囊</p>
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
          onClick={() => router.push("/points")}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="font-semibold text-amber-700">{loading ? "..." : user?.balance ?? 0}</span>
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
