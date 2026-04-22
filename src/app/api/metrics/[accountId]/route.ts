// ============================================
// API: ดึง DailyMetrics ของบัญชี TikTok ที่เลือก (รองรับ "all")
// GET /api/metrics/[accountId]
// Query params: ?startDate=... & endDate=...
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // ป้องกันไม่มี session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const { accountId } = await params;
    
    // ตั้งค่าช่วงวันที่
    const searchParams = request.nextUrl.searchParams;
    let startDate = new Date();
    let endDate = new Date();
    
    if (searchParams.get("startDate") && searchParams.get("endDate")) {
      startDate = new Date(searchParams.get("startDate") as string);
      endDate = new Date(searchParams.get("endDate") as string);
      
      // ปรับเวลาให้คลุมทั้งวัน (Start of day -> End of day)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // ค่าเริ่มต้นย้อนหลัง 14 วัน
      const days = parseInt(searchParams.get("days") || "14", 10);
      startDate.setDate(endDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }

    // หาสิทธิ์บัญชีทั้งหมดที่มี
    const userAccounts = await prisma.tikTokAccount.findMany({
      where: { userId: session.user.id },
    });
    
    if (userAccounts.length === 0) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
    }

    let targetAccountIds: string[] = [];
    let responseAccountInfo = null;

    if (accountId === "all") {
      targetAccountIds = userAccounts.map(a => a.id);
      responseAccountInfo = {
        id: "all",
        handle: "ทุกบัญชีรวมกัน",
        displayName: "ภาพรวมทั้งหมด",
      };
    } else {
      const account = userAccounts.find(a => a.id === accountId);
      if (!account) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงบัญชีนี้" }, { status: 404 });
      }
      targetAccountIds = [account.id];
      responseAccountInfo = {
        id: account.id,
        handle: account.handle,
        displayName: account.displayName,
      };
    }

    // ดึง Metrics สำหรับ targetAccountIds ระหว่าง startDate - endDate
    const rawMetrics = await prisma.dailyMetric.findMany({
      where: {
        accountId: { in: targetAccountIds },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    // ในกรณี accountId="all" วันที่อาจซ้ำกันหลายบัญชี ดังนั้นเราต้องพับรวม (Aggregate) ตามวันที่
    const metricsMap = new Map<string, any>();
    
    for (const m of rawMetrics) {
      const dateStr = m.date.toISOString().split("T")[0];
      if (!metricsMap.has(dateStr)) {
        metricsMap.set(dateStr, {
          date: dateStr,
          revenue: 0,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          profileViews: 0,
          followers: 0,
        });
      }
      
      const target = metricsMap.get(dateStr);
      target.revenue += m.revenue;
      target.views += m.views;
      target.likes += m.likes;
      target.comments += m.comments;
      target.shares += m.shares;
      target.profileViews += m.profileViews;
      // followers อาจะใช้วิธีบวกกันได้ หากมองว่าผู้ติตตามรวมทุกคน
      target.followers += m.followers;
    }

    // เรียงตามวันที่
    const metrics = Array.from(metricsMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Summary (รวมทุกวันในผลลัพธ์)
    const summary = metrics.reduce(
      (acc, m) => ({
        totalRevenue: acc.totalRevenue + m.revenue,
        totalViews: acc.totalViews + m.views,
        totalLikes: acc.totalLikes + m.likes,
        totalComments: acc.totalComments + m.comments,
        totalShares: acc.totalShares + m.shares,
        totalProfileViews: acc.totalProfileViews + m.profileViews,
      }),
      {
        totalRevenue: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalProfileViews: 0,
      }
    );

    return NextResponse.json({
      account: responseAccountInfo,
      summary,
      metrics,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}
