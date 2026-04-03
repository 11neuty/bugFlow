import { z } from "zod";

const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/bugflow?schema=public";
const LOCAL_ACCESS_SECRET = "dev-access-secret-change-me-immediately";
const LOCAL_REFRESH_SECRET = "dev-refresh-secret-change-me-immediately";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  REFRESH_SECRET: z.string().min(16),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

function resolveDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL ??
    (process.env.NODE_ENV === "production" ? LOCAL_DATABASE_URL : LOCAL_DATABASE_URL)
  );
}

export function getDatabaseEnvDiagnostics() {
  const source = process.env.DATABASE_URL
    ? "DATABASE_URL"
    : process.env.POSTGRES_PRISMA_URL
      ? "POSTGRES_PRISMA_URL"
      : process.env.POSTGRES_URL
        ? "POSTGRES_URL"
        : process.env.NEON_DATABASE_URL
          ? "NEON_DATABASE_URL"
          : "LOCAL_FALLBACK";
  const url = resolveDatabaseUrl();

  return {
    source,
    hasUrl: Boolean(url),
    hasSslMode: url.includes("sslmode=require"),
    isLocalFallback: source === "LOCAL_FALLBACK",
  };
}

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    DATABASE_URL: resolveDatabaseUrl(),
    JWT_SECRET: process.env.JWT_SECRET ?? LOCAL_ACCESS_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET ?? LOCAL_REFRESH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(", "));
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
