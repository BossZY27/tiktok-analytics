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
    if (data.length > 0) {
      console.log("🔍 Sample CSV Row:", data[0]);
    }

    let importCount = 0;
    let lastError = "";

    for (const row of data) {
      try {
        const rawDate = row["Date"] || row["date"] || row["วันที่"];
        if (!rawDate) continue;

        // แปลงวันที่ (รองรับทั้ง April 16 และ 2026-04-16)
        let finalDate: Date;
        const cleanDateStr = String(rawDate).trim();
        
        if (typeof rawDate === "number") {
            finalDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else {
            const dateWithYear = cleanDateStr.includes(String(year)) ? cleanDateStr : `${cleanDateStr} ${year}`;
            finalDate = new Date(dateWithYear);
        }

        if (isNaN(finalDate.getTime())) continue;

        // ทำความสะอาดตัวเลข
        const clean = (v: any) => {
          if (typeof v === "string") return parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
          return parseFloat(v) || 0;
        };

        const views = clean(row["Video Views"] || row["views"]);
        const profileViews = clean(row["Profile Views"] || row["profile_views"]);
        const likes = clean(row["Likes"] || row["likes"]);
        const comments = clean(row["Comments"] || row["comments"]);
        const shares = clean(row["Shares"] || row["shares"]);
        const revenue = clean(row["Estimated earnings"] || row["earnings"]);

        await prisma.dailyMetric.upsert({
          where: {
            accountId_date: {
              accountId: account.id,
              date: finalDate,
            }
          },
          update: { views, profileViews, likes, comments, shares, revenue },
          create: {
            accountId: account.id,
            date: finalDate,
            views,
            profileViews,
            likes,
            comments,
            shares,
            revenue,
          }
        });
        importCount++;
      } catch (rowError: any) {
        lastError = rowError.message;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bot sync completed: ${importCount} items for ${accountHandle}`,
      lastError: lastError || null,
      debug: data.length > 0 ? data[0] : "Empty file"
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
