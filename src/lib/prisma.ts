import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Schema updated with lastSyncAt, syncStatus, lastSyncRows fields
import pg from "pg";

// Vercel / pg Module SSL Fix: pg treats sslmode=require as verify-full and crashes.
// We must strip it out and manually pass ssl: { rejectUnauthorized: false }
const rawConnectionString = (process.env.DATABASE_URL || "").trim();
const connectionString = rawConnectionString.replace("?sslmode=require", "").replace("&sslmode=require", "");

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
