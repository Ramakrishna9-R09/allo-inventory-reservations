import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { ReservationStatus } from "@prisma/client";

export const isSQLite =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.startsWith("file:") ||
  process.env.DATABASE_URL.includes("sqlite");
