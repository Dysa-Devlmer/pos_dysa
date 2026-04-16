import { PrismaClient } from "@prisma/client";

const DB_URL = "postgresql://pos_admin:pos_secret_2025@localhost:5432/pos_chile_db?schema=public";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.POS_DATABASE_URL || DB_URL },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
