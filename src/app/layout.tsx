// ============================================
// Root Layout
// ครอบทุกหน้าด้วย SessionProvider + Google Font
// ============================================

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TikTok Analytics Dashboard",
  description:
    "แดชบอร์ดวิเคราะห์ข้อมูล TikTok พร้อม AI Insights — รองรับหลายบัญชี",
  keywords: ["TikTok", "Analytics", "Dashboard", "Social Media"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
