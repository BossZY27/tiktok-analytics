// ============================================
// Root Page: Redirect ไปหน้า Dashboard
// ============================================

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
