// ============================================
// API: นำเข้าข้อมูล TikTok จากไฟล์ CSV/XLSX
// POST /api/tiktok/import
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const userRole = (session.user as any).role || "VIEWER";
    if (userRole === "VIEWER") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์นำเข้าข้อมูล" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const accountId = formData.get("accountId") as string;
    const year = parseInt(formData.get("year") as string || "2026", 10);

    if (!file || !accountId) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน (ต้องการไฟล์และไอดีบัญชี)" }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์เข้าถึงบัญชี
    const account = await prisma.tikTokAccount.findFirst({
      where: { id: accountId, userId: (userRole === "ADMIN") ? undefined : session.user.id }
    });

    if (!account) {
      return NextResponse.json({ error: "ไม่พบข้อมูลบัญชีหรือไม่มีสิทธิ์เข้าถึง" }, { status: 404 });
    }

    const buffer = await file.arrayBuffer();
    let data: any[] = [];

    if (file.name.endsWith(".csv")) {
      const text = new TextDecoder().decode(buffer);
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      data = result.data;
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return NextResponse.json({ error: "ไม่รองรับนามสกุลไฟล์นี้ (ใช้ได้แค่ .csv, .xlsx)" }, { status: 400 });
    }

    console.log(`Importing ${data.length} rows for account ${account.handle}`);

    let importCount = 0;

    for (const row of data) {
      // แมพคอลัมน์จากไฟล์ตัวอย่าง (Overview.csv)
      // Date, Video Views, Profile Views, Likes, Comments, Shares
      const rawDate = row["Date"] || row["date"] || row["วันที่"];
      if (!rawDate) continue;

      // พยายามแปลงวันที่ (รองรับรูปแบบ "April 12" หรือวันที่แบบ Excel)
      let finalDate: Date;
      if (typeof rawDate === "number") {
        // กรณีเป็นเลขใน Excel
        finalDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      } else {
        // กรณีเป็น String เช่น "April 12"
        const dateStr = `${rawDate} ${year}`;
        finalDate = new Date(dateStr);
      }

      if (isNaN(finalDate.getTime())) continue;

      // ดึงค่าสถิติต่างๆ
      const views = parseInt(row["Video Views"] || row["views"] || row["0"], 10) || 0;
      const profileViews = parseInt(row["Profile Views"] || row["profile_views"] || row["0"], 10) || 0;
      const likes = parseInt(row["Likes"] || row["likes"] || row["0"], 10) || 0;
      const comments = parseInt(row["Comments"] || row["comments"] || row["0"], 10) || 0;
      const shares = parseInt(row["Shares"] || row["shares"] || row["0"], 10) || 0;

      // บันทึกลงฐานข้อมูลแบบ Upsert (ถ้ามีวันนี้อยู่แล้วให้ทับ)
      await prisma.dailyMetric.upsert({
        where: {
          accountId_date: {
            accountId: accountId,
            date: finalDate,
          }
        },
        update: {
          views,
          profileViews,
          likes,
          comments,
          shares,
        },
        create: {
          accountId: accountId,
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

    return NextResponse.json({ 
      success: true, 
      message: `นำเข้าข้อมูลสำเร็จ ${importCount} รายการ`,
      importCount 
    });

  } catch (error) {
    console.error("Import Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผลไฟล์" }, { status: 500 });
  }
}
