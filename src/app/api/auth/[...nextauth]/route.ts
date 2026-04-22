// ============================================
// NextAuth API Route Handler
// จัดการ login/logout/session ทั้งหมด
// ============================================

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
