import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  REFRESH_SECRET: z.string().min(16),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/bugflow?schema=public",
    JWT_SECRET:
      process.env.JWT_SECRET ?? "dev-access-secret-change-me-immediately",
    REFRESH_SECRET:
      process.env.REFRESH_SECRET ?? "dev-refresh-secret-change-me-immediately",
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(", "));
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
