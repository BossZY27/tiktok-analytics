// ============================================
// API: จัดการรายชื่อ TikTok Accounts
// GET  - ดึงข้อมูลบัญชี (RBAC: Admin ดูได้หมด, อื่นๆ ดูเฉพาะของตน)
// POST - สร้างบัญชีแบบ Manual (เฉพาะ Admin/Editor)
// ============================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// --- GET: ดึงรายการบัญชี ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    // ใช้ Raw SQL ดึงข้อมูลเพื่อให้ชัวร์ว่าไม่ติด Cache ของ Client
    // เงื่อนไข: isActive = true และไม่ได้ถูกลบ (deletedAt IS NULL)
    let query = `
      SELECT id, handle, "displayName", "avatarUrl", "userId", "lastSyncAt", "syncStatus", "lastSyncRows"
      FROM "TikTokAccount"
      WHERE "isActive" = true AND "deletedAt" IS NULL
    `;
    
    const params: any[] = [];
    if (role !== "ADMIN") {
      query += ` AND "userId" = $1`;
      params.push(userId);
    }
    
    query += ` ORDER BY "createdAt" ASC`;

    const accounts = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" }, { status: 500 });
  }
}

// --- POST: สร้างบัญชีแบบ Manual ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อน" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;
    if (role === "VIEWER") {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์สร้างบัญชี" }, { status: 403 });
    }

    const { handle, displayName, browserProfile } = await req.json();

    if (!handle) {
      return NextResponse.json({ error: "กรุณาระบุ handle (เช่น @username)" }, { status: 400 });
    }

    const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
    const cleanProfile = browserProfile || "Default";

    // ตรวจสอบว่ามีบัญชีนี้อยู่แล้วหรือไม่สำหรับ User นี้ (ใช้ Raw SQL เพื่อความแม่นยำ)
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "TikTokAccount" WHERE handle = $1 AND "userId" = $2 AND "deletedAt" IS NULL`,
      cleanHandle, userId
    );

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "บัญชีนี้มีอยู่ในระบบแล้ว" }, { status: 400 });
    }

    // สร้าง ID ใหม่
    const newId = `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cleanDisplayName = displayName || cleanHandle.replace("@", "");

    // บันทึกด้วย Raw SQL (เพิ่ม browserProfile)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "TikTokAccount" ("id", "userId", "handle", "displayName", "isManual", "isActive", "lastSyncRows", "browserProfile", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      newId, userId, cleanHandle, cleanDisplayName, true, true, 0, cleanProfile
    );

    // ส่งคืนข้อมูลที่เพิ่งสร้าง
    return NextResponse.json({
      id: newId,
      handle: cleanHandle,
      displayName: cleanDisplayName,
      userId: userId,
      isManual: true,
      isActive: true
    });
  } catch (error: any) {
    console.error("Error creating account:", error);
    return NextResponse.json({ 
      error: "เกิดข้อผิดพลาดในการสร้างบัญชี", 
      details: error.message 
    }, { status: 500 });
  }
}
