import type { Metadata } from "next";
import "./globals.css";
import UserProvider from "@/components/UserProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "AI 保险教练",
  description: "保险代理人的幕后智囊",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <UserProvider>
          <AppShell>{children}</AppShell>
        </UserProvider>
      </body>
    </html>
  );
}
