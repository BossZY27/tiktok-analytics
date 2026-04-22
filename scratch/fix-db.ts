import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = "postgresql://postgres.msbbzuohcseidnozjrot:bossboss273BB27@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0";

async function main() {
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🚀 Starting database fix...");

  try {
    // 1. ตรวจสอบว่าช่อง isManual มีหรือยัง
    console.log("Checking TikTokAccount table...");
    await prisma.$executeRaw`
      ALTER TABLE "TikTokAccount" 
      ADD COLUMN IF NOT EXISTS "isManual" BOOLEAN DEFAULT false;
    `;
    console.log("✅ Column 'isManual' checked/added.");

    // 2. ตรวจสอบว่าช่อง profileViews มีหรือยัง
    console.log("Checking DailyMetric table...");
    await prisma.$executeRaw`
      ALTER TABLE "DailyMetric" 
      ADD COLUMN IF NOT EXISTS "profileViews" INTEGER DEFAULT 0;
    `;
    console.log("✅ Column 'profileViews' checked/added.");

    console.log("🎉 Database fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
