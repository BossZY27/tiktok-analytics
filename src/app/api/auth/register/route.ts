import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน กรุณากรอกชื่อ อีเมล และรหัสผ่าน" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีอีเมลนี้หรือยัง
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น" },
        { status: 400 }
      );
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 12);

    // สร้าง user ใหม่
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // กำหนดบทบาทแรกเป็น VIEWER หรือจะตั้งเป็น ADMIN ก็ได้ขึ้นอยู่กับนโยบาย (ตอนนี้ตั้งเป็น ADMIN ชั่วคราวเพื่อให้ตั้งค่าได้)
        role: "ADMIN",
      },
    });

    return NextResponse.json(
      { message: "สมัครสมาชิกสำเร็จ", user: { id: newUser.id, email: newUser.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "ระบบเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
