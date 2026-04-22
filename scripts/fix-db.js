const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🛠️ Attempting to add sync columns directly...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "TikTokAccount" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TikTokAccount" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TikTokAccount" ADD COLUMN IF NOT EXISTS "lastSyncRows" INTEGER DEFAULT 0;`);
    console.log('✅ Successfully added all sync columns to TikTokAccount table!');
  } catch (error) {
    console.error('❌ Failed to update database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
