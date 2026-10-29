import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI家庭风险测评·10题内测版",
  description: "8 个固定风险域 + 2 个 AI 追问的家庭风险筛查内测版。",
};

export default function Checkup10Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
