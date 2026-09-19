import { PrismaClient } from "@prisma/client";

// Im Dev-Modus laedt Next.js Module neu; ohne Singleton sammeln sich
// Verbindungen an, bis SQLite blockiert.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
