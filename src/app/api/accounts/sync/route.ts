/** Force Recompile: Refreshed Import Syntax **/
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import path from "path";

/**
 * API สำหรับสั่งรันบอท Sync ข้อมูล TikTok
 * POST /api/accounts/sync
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, mode } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "กรุณาระบุ accountId" }, { status: 400 });
    }

    let handle = "";
    let profile = "Default";

    if (mode === "EXISTING" && accountId !== "NEW") {
      // 1. ดึงข้อมูลบัญชีเดิม
      const account = await prisma.tikTokAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return NextResponse.json({ error: "ไม่พบข้อมูลบัญชีนี้ในระบบ" }, { status: 404 });
      }

      handle = account.handle;
      profile = account.browserProfile || "Default";
    } else {
      // 2. สำหรับกรณีสร้างใหม่ (DISCOVERY MODE)
      // เราจะรันบอทโดยมุ่งเป้าไปที่ "บัญชีใหม่" (จะใช้เงื่อนไขพิเศษในสคริปต์บอท หรือรันตัวตนปัจจุบัน)
      handle = "NEW_ACCOUNT_DISCOVERY"; 
      profile = "Default"; // หรือให้บอสเลือกได้ในอนาคต
    }

    // 1.1 Security Hardening: ป้องกัน Command Injection โดยกรองเฉพาะตัวอักษรที่อนุญาตในชื่อ TikTok
    // TikTok handles only allow: alphanumeric, underscore, and dot
    const safeHandleRegex = /^@?[a-zA-Z0-9._]+$/;
    if (handle !== "NEW_ACCOUNT_DISCOVERY" && !safeHandleRegex.test(handle)) {
      return NextResponse.json({ error: "ชื่อบัญชี TikTok มีอักขระที่ไม่ปลอดภัย" }, { status: 400 });
    }

    console.log(`[Sync API] Starting bot in ${mode} mode for ${handle} using profile ${profile}`);

    // 2. สั่งรันบอทผ่าน child_process
    const botProcess = spawn("npx", ["tsx", "scripts/bot-studio.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BOT_TARGET_HANDLE: handle,
        BOT_TARGET_PROFILE: profile,
        SYNC_MODE: mode
      },
      shell: true,
      detached: true,
      stdio: "ignore",
    });

    botProcess.unref();

    return NextResponse.json({
      success: true,
      message: mode === "EXISTING" 
        ? `เริ่มการอัปเดตข้อมูลบัญชี ${handle} แล้วครับ`
        : `เริ่มการค้นหาบัญชีใหม่แล้วครับ บราว์เซอร์จะเปิดขึ้นมาในครู่เดียว`,
    });
  } catch (error: any) {
    console.error("[Sync API Error]:", error);
    return NextResponse.json({ 
      error: `ไม่สามารถเริ่มการ Sync ได้: ${error.message}`, 
      details: error.stack 
    }, { status: 500 });
  }
}
