// ============================================
// SessionProvider Wrapper
// ครอบ layout เพื่อให้ทุกหน้าเข้าถึง session ได้
// ============================================

"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
