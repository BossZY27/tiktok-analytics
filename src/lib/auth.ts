// ============================================
// NextAuth.js Configuration
// ใช้ Credentials Provider (email + password)
// รองรับ Google Provider ในอนาคต
// ============================================

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // === Providers (วิธีล็อกอิน) ===
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // ตรวจว่าส่ง email/password มาหรือไม่
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอก Email และ Password");
        }

        // ค้นหา user จาก database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("ไม่พบผู้ใช้งานนี้ในระบบ");
        }

        // ตรวจสอบ password (เปรียบเทียบ hash)
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // ส่งข้อมูล user กลับ (จะถูกเก็บใน session)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),

    // === เตรียมไว้สำหรับ Google Login ในอนาคต ===
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],

  // === Session Strategy: ใช้ JWT (ไม่ต้องเก็บ session ใน DB) ===
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },

  // === Callbacks: เพิ่มข้อมูล role เข้าไปใน session ===
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },

  // === Pages: กำหนดหน้าล็อกอิน custom ===
  pages: {
    signIn: "/login",
  },

  // === Secret: ใช้เข้ารหัส JWT ===
  secret: process.env.NEXTAUTH_SECRET,
};
