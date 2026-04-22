// scripts/create-account.js
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const handle = '_bpkm_';
    const account = await prisma.tikTokAccount.upsert({
      where: { handle: handle },
      update: {},
      create: {
        handle: handle,
        displayName: 'Boss (Bot Test)',
        userId: 'admin-manual', 
      },
    });
    console.log(`✅ SUCCESS: Account ${account.handle} is now ready in the database!`);
  } catch (error) {
    console.error('❌ Error creating account:', error);
    console.error('Details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
