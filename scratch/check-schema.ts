import { prisma } from "../src/lib/prisma";

async function checkTable() {
  try {
    console.log("Checking TikTokAccount table structure...");
    const account = await prisma.tikTokAccount.findFirst();
    console.log("Connection successful!");
    console.log("Sample Data:", account);
    console.log("Checking for browserProfile field...");
    if (account && 'browserProfile' in account) {
      console.log("SUCCESS: browserProfile field exists!");
    } else if (account) {
      console.log("WARNING: account found but browserProfile is missing.");
    } else {
      console.log("INFO: Table is empty, cannot verify fields easily without a row.");
    }
  } catch (err: any) {
    console.error("DEBUG ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
