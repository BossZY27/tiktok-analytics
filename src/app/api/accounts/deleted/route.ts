import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// --- GET: ดึงรายการบัญชีในถังขยะ (deletedAt IS NOT NULL) ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    // --- ส่วนเสริม: ระบบ Cleanup อัตโนมัติ (ใช้ Raw SQL เพื่อความแม่นยำ) ---
    try {
      // ลบบัญชีที่อยู่ในถังขยะเกิน 7 วันถาวร
      await prisma.$executeRawUnsafe(
        `DELETE FROM "TikTokAccount" WHERE "deletedAt" < NOW() - INTERVAL '7 days'`
      );
    } catch (cleanupErr) {
      console.error("Auto-cleanup failed:", cleanupErr);
    }

    // ดึงรายการที่ยังอยู่ในถังขยะ (ยังไม่พ้น 7 วัน) โดยใช้ Raw SQL
    let query = `
      SELECT id, handle, "displayName", "avatarUrl", "deletedAt"
      FROM "TikTokAccount"
      WHERE "deletedAt" IS NOT NULL
    `;
    
    const params: any[] = [];
    if (role !== "ADMIN") {
      query += ` AND "userId" = $1`;
      params.push(userId);
    }
    
    query += ` ORDER BY "deletedAt" DESC`;

    const trashAccounts = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    return NextResponse.json(trashAccounts);
  } catch (error) {
    console.error("Error fetching trash accounts:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลถังขยะ" }, { status: 500 });
  }
}
