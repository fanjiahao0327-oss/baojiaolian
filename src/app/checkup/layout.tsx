import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI家庭风险测评",
  description: "匿名家庭风险自查工具：不推销、不承诺，只给风险判断。",
};

export default function CheckupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
