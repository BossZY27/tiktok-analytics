import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const account = await prisma.tikTokAccount.findFirst({
    where: { handle: { contains: "bpkm" } }
  });
  if (account) {
    console.log(`✅ Found Account: ${account.handle} (ID: ${account.id})`);
  } else {
    console.log(`❌ Account not found. please add '_bpkm_' in the Dashboard first!`);
  }
}

check().finally(() => prisma.$disconnect());
