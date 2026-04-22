// ============================================
// API: ท่อรับส่งข้อมูลสำหรับบอทอัตโนมัติ (Bot Import)
// POST /api/bot/import
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    // 1. ตรวจสอบกุญแจลับ (Bot Secret Header)
    const botSecret = request.headers.get("x-bot-secret");
    const expectedSecret = process.env.BOT_SECRET;

    if (!botSecret || botSecret !== expectedSecret) {
      console.warn("Unauthorized bot access attempt detected.");
      return NextResponse.json({ error: "Unauthorized: Invalid Bot Secret" }, { status: 401 });
    }

    // 2. รับข้อมูลจาก FormData (ส่งมาเป็นไฟล์ CSV)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const accountHandle = formData.get("accountHandle") as string; // เช่น @bosszy
    const year = parseInt(formData.get("year") as string || "2026", 10);

    if (!file || !accountHandle) {
      return NextResponse.json({ error: "Missing file or accountHandle" }, { status: 400 });
    }

    // 3. ค้นหาบัญชีจาก Handle (รองรับทั้งแบบมี @ และไม่มี @)
    const handleWithoutAt = accountHandle.startsWith("@") ? accountHandle.substring(1) : accountHandle;
    const handleWithAt = `@${handleWithoutAt}`;
    
    let account = await prisma.tikTokAccount.findFirst({
      where: {
        OR: [
          { handle: handleWithoutAt },
          { handle: handleWithAt }
        ]
      }
    });
    
    // ถ้ายังไม่มีบัญชี ให้สร้างโปรไฟล์รอไว้เลย (Auto-create)
    if (!account) {
      console.log(`🆕 Creating new account for ${accountHandle}...`);
      
      // ค้นหา User คนแรกในระบบมาเป็นเจ้าของบัญชี
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return NextResponse.json({ error: "No users exist in system. Please register first." }, { status: 400 });
      }

      account = await prisma.tikTokAccount.create({ 
        data: {
          handle: accountHandle.startsWith("@") ? accountHandle : `@${accountHandle}`,
          displayName: accountHandle,
          userId: firstUser.id
        }
      });
    }

    // 4. ประมวลผลไฟล์ CSV
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    const data = result.data as any[];

    console.log(`Bot importing ${data.length} rows for ${accountHandle}`);

    let importCount = 0;

    for (const row of data) {
      const rawDate = row["Date"] || row["date"] || row["วันที่"];
      if (!rawDate) continue;

      // แปลงวันที่ (รองรับรูปวันที่ใน TikTok Studio CSV)
      let finalDate: Date;
      if (typeof rawDate === "number") {
          finalDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      } else {
          // กรณี "April 12" -> "April 12 2024"
          const dateStr = rawDate.includes(String(year)) ? rawDate : `${rawDate} ${year}`;
          finalDate = new Date(dateStr);
      }

      if (isNaN(finalDate.getTime())) continue;

      // ดึงค่าสถิติ
      const views = parseInt(row["Video Views"] || row["views"] || row["0"], 10) || 0;
      const profileViews = parseInt(row["Profile Views"] || row["profile_views"] || row["0"], 10) || 0;
      const likes = parseInt(row["Likes"] || row["likes"] || row["0"], 10) || 0;
      const comments = parseInt(row["Comments"] || row["comments"] || row["0"], 10) || 0;
      const shares = parseInt(row["Shares"] || row["shares"] || row["0"], 10) || 0;

      // บันทึกลงฐานข้อมูลแบบ Upsert
      await prisma.dailyMetric.upsert({
        where: {
          accountId_date: {
            accountId: account.id,
            date: finalDate,
          }
        },
        update: { views, profileViews, likes, comments, shares },
        create: {
          accountId: account.id,
          date: finalDate,
          views,
          profileViews,
          likes,
          comments,
          shares,
        }
      });
      importCount++;
    }

    // 5. อัปเดตสถานะการ Sync ลงในบัญชี TikTok (ใช้ Raw SQL เพื่อบายพาสปัญหา Cache ของ Prisma Client)
    try {
      await prisma.$executeRaw`
        UPDATE "TikTokAccount" 
        SET "lastSyncAt" = ${new Date()}, 
            "syncStatus" = 'SUCCESS', 
            "lastSyncRows" = ${importCount} 
        WHERE "id" = ${account.id}
      `;
    } catch (dbError) {
      console.warn("Could not update sync status metadata:", dbError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bot sync completed: ${importCount} items for ${accountHandle}` 
    });

  } catch (error: any) {
    console.error("Bot Import Error:", error);
    
    // พยายามบันทึกสถานะ FAILED หากหาบัญชีเจอแล้ว
    try {
      const formData = await request.formData();
      const accountHandle = formData.get("accountHandle") as string;
      if (accountHandle) {
        const handleWithoutAt = accountHandle.startsWith("@") ? accountHandle.substring(1) : accountHandle;
        await prisma.$executeRaw`
          UPDATE "TikTokAccount" 
          SET "syncStatus" = 'FAILED', 
              "lastSyncAt" = ${new Date()} 
          WHERE "handle" IN (${handleWithoutAt}, ${`@${handleWithoutAt}`})
        `;
      }
    } catch (e) { /* ignore */ }

    return NextResponse.json({ error: "Bot import failed", details: error.message }, { status: 500 });
  }
}
