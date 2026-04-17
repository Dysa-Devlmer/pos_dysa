import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.POS_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "POS_DATABASE_URL (o DATABASE_URL) no definida. " +
    "Configura la variable de entorno antes de iniciar la app."
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
