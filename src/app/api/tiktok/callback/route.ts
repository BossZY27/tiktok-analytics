import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error || !code) {
      console.error("TikTok Auth Error:", error, errorDescription);
      return NextResponse.redirect(new URL("/dashboard?error=tiktok_auth_failed", request.url));
    }

    // ดึง userId จาก state parameter (ที่ฝังไว้ตอน authorize)
    // รอบนี้อัปเดตใหม่เป็น plain text userId เพื่อความชัวร์ใน Sandbox
    const userId = searchParams.get("state") || "";
    
    if (!userId || userId === "unknown") {
      console.error("TikTok Callback: No userId in state");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!userId) {
      console.error("TikTok Callback: No userId in state or session");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const CLIENT_KEY = (process.env.TIKTOK_CLIENT_KEY || "").trim();
    const CLIENT_SECRET = (process.env.TIKTOK_CLIENT_SECRET || "").trim();
    const NEXTAUTH_URL = (process.env.NEXTAUTH_URL || "").trim();
    const REDIRECT_URI = NEXTAUTH_URL 
      ? `${NEXTAUTH_URL}/api/tiktok/callback`
      : "http://localhost:3000/api/tiktok/callback";

    const tokenBody = new URLSearchParams();
    tokenBody.append("client_key", CLIENT_KEY);
    tokenBody.append("client_secret", CLIENT_SECRET);
    tokenBody.append("code", code);
    tokenBody.append("grant_type", "authorization_code");
    tokenBody.append("redirect_uri", REDIRECT_URI);

    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: tokenBody.toString(),
    });

    const tokenRawText = await tokenRes.text();
    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenRawText);
    } catch (e) {
      return NextResponse.json({ 
        debug: "token_exchange_not_json",
        raw_response: tokenRawText,
        status: tokenRes.status,
        userId: userId
      });
    }

    if (!tokenRes.ok || tokenData.error) {
      console.error("TikTok Token Error:", tokenData);
      return NextResponse.json({ 
        debug: "token_exchange_failed",
        tiktok_error: tokenData,
        userId_from_state: userId,
        redirect_uri: REDIRECT_URI,
        key_diagnostic: {
          length: CLIENT_KEY.length,
          first_char: CLIENT_KEY.charCodeAt(0),
          last_char: CLIENT_KEY.charCodeAt(CLIENT_KEY.length - 1)
        },
        secret_diagnostic: {
          length: CLIENT_SECRET.length,
          last_char: CLIENT_SECRET.charCodeAt(CLIENT_SECRET.length - 1)
        }
      });
    }

    // Now get the user info
    const userInfoRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfoData = await userInfoRes.json();
    if (!userInfoRes.ok || userInfoData.error) {
      console.error("TikTok User Info Error:", userInfoData);
      return NextResponse.redirect(new URL("/dashboard?error=profile_fetch_failed", request.url));
    }

    const tiktokUser = userInfoData.data?.user;
    if (!tiktokUser) {
      return NextResponse.redirect(new URL("/dashboard?error=invalid_profile", request.url));
    }

    const existingAccount = await prisma.tikTokAccount.findFirst({
      where: { userId: userId }
    });

    if (existingAccount) {
      await prisma.tikTokAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenData.access_token,
          handle: tiktokUser.display_name || "TikTok User",
          displayName: tiktokUser.display_name,
          avatarUrl: tiktokUser.avatar_url,
        },
      });
    } else {
      await prisma.tikTokAccount.create({
        data: {
          userId: userId,
          accessToken: tokenData.access_token,
          handle: tiktokUser.display_name || "TikTok User",
          displayName: tiktokUser.display_name,
          avatarUrl: tiktokUser.avatar_url,
        },
      });
    }

    // Success! Redirect to dashboard to show the new account
    return NextResponse.redirect(new URL("/dashboard?success=tiktok_connected", request.url));
  } catch (err: any) {
    console.error("TikTok Callback Catch Error:", err);
    return NextResponse.json({ 
      error: "internal_server_error",
      message: err.message,
      stack: err.stack,
      hint: "Check if Prisma or Database connection is failing"
    }, { status: 500 });
  }
}
