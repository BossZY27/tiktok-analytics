import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// --- DELETE: ย้ายบัญชีไปถังขยะ (Soft Delete) ---
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ปรับเป็น Promise ตาม Next.js 15+
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: accountId } = await params; // ต้อง await params ก่อน

    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    console.log(`[DELETE] Direct SQL lookup for account: ${accountId}`);

    // ค้นหาบัญชีโดยใช้ Raw SQL สายตรง
    const accounts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "userId" FROM "TikTokAccount" WHERE "id" = $1 LIMIT 1`,
      accountId
    );

    if (!accounts || accounts.length === 0) {
      console.error(`[DELETE] Account not found via direct SQL: ${accountId}`);
      return NextResponse.json({ error: "ไม่พบบัญชีนี้ในระบบฐานข้อมูล" }, { status: 404 });
    }

    const account = accounts[0];

    // ตรวจสอบสิทธิ์
    if (role !== "ADMIN" && account.userId !== userId) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ลบบัญชีนี้" }, { status: 403 });
    }

    // ทำการ Soft Delete ด้วย Raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE "TikTokAccount" SET "deletedAt" = NOW() WHERE "id" = $1`,
      accountId
    );

    return NextResponse.json({ 
      success: true, 
      message: "ย้ายบัญชีไปที่ถังขยะเรียบร้อยแล้ว" 
    });
  } catch (error: any) {
    console.error("[DELETE] Critical SQL Error:", error);
    return NextResponse.json({ 
      error: "เกิดข้อผิดพลาดในการลบ", 
      details: error.message 
    }, { status: 500 });
  }
}

// --- PATCH: กู้คืนบัญชี (Restore) ---
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;
    console.log(`[PATCH/Restore] Attempting to restore account: ${accountId} for user: ${userId}`);

    // ค้นหาบัญชีด้วย Raw SQL
    const accounts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "userId" FROM "TikTokAccount" WHERE "id" = $1 LIMIT 1`,
      accountId
    );

    if (!accounts || accounts.length === 0) {
      console.error(`[PATCH/Restore] Account ${accountId} not found in DB`);
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    const account = accounts[0];
    console.log(`[PATCH/Restore] Found account owner: ${account.userId}`);

    if (role !== "ADMIN" && account.userId !== userId) {
      console.error(`[PATCH/Restore] Permission denied. Role: ${role}, Owner: ${account.userId}, User: ${userId}`);
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์กู้คืนบัญชีนี้" }, { status: 403 });
    }

    // กู้คืนด้วย Raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE "TikTokAccount" SET "deletedAt" = NULL WHERE "id" = $1`,
      accountId
    );

    console.log(`[PATCH/Restore] Successfully restored: ${accountId}`);

    return NextResponse.json({ 
      success: true, 
      message: "กู้คืนบัญชีเรียบร้อยแล้ว" 
    });
  } catch (error: any) {
    console.error("[PATCH] Critical SQL Error:", error);
    return NextResponse.json({ 
      error: "เกิดข้อผิดพลาดในการกู้คืน", 
      details: error.message 
    }, { status: 500 });
  }
}
