import { PrismaClient } from "@prisma/client";

import { getEnv } from "@/lib/env";

const env = getEnv();

process.env.DATABASE_URL = process.env.DATABASE_URL ?? env.DATABASE_URL;

const prismaClientSingleton = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
