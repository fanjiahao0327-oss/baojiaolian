import type { Metadata } from "next";
import "./globals.css";
import UserProvider from "@/components/UserProvider";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "保险 AI 助手",
  description: "保险代理人的个人客户经营工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ErrorBoundary>
          <UserProvider>
            <AppShell>{children}</AppShell>
          </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
