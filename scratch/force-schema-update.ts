import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function runRawSql() {
  try {
    console.log("🚀 เจาะทางด่วน SQL: กำลังเพิ่มคอลัมน์ browserProfile...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "TikTokAccount" 
      ADD COLUMN IF NOT EXISTS "browserProfile" TEXT DEFAULT 'Default';
    `);
    console.log("✅ สำเร็จ! คอลัมน์ถูกติดตั้งเรียบร้อยแล้วครับบอส");
  } catch (err: any) {
    console.error("❌ พลาดไปนิดเดียว:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

runRawSql();
