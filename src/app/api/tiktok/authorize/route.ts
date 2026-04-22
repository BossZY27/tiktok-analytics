import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY?.trim();
  const NEXTAUTH_URL = process.env.NEXTAUTH_URL?.trim();
  const REDIRECT_URI = NEXTAUTH_URL 
    ? `${NEXTAUTH_URL}/api/tiktok/callback`
    : "http://localhost:3000/api/tiktok/callback";

  if (!CLIENT_KEY) {
    return NextResponse.json({ error: "Missing TIKTOK_CLIENT_KEY" }, { status: 500 });
  }

  // ดึง session เพื่อเอา userId
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id || "unknown";

  // ใช้ userId เป็น state ตรงๆ เลยเพื่อความสั้นและชัวร์สำหรับ Sandbox
  const state = userId;

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", CLIENT_KEY);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,user.info.stats,video.list");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
