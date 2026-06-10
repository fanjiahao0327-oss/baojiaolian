"use client";

import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/", label: "今天" },
  { href: "/clients", label: "客户" },
  { href: "/assistant", label: "助手" },
  { href: "/mine", label: "我的" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden bg-white border-t border-gray-100 grid grid-cols-4 h-14 shrink-0 safe-bottom">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={`text-xs transition-colors ${
              active ? "text-brand-600 font-semibold" : "text-gray-400"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
