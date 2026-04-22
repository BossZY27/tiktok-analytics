import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const accounts = await prisma.tikTokAccount.findMany({
    select: { id: true, handle: true },
    take: 10
  })
  console.log('--- Current Accounts in DB ---')
  console.dir(accounts, { depth: null })
  console.log('------------------------------')
}

main().catch(console.error).finally(() => prisma.$disconnect())
