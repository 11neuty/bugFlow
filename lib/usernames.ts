import type { Prisma, PrismaClient } from "@prisma/client";

import { MAX_USERNAME_LENGTH } from "@/lib/constants";

type UsernameClient = Prisma.TransactionClient | PrismaClient;

function sanitizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_USERNAME_LENGTH);
}

function buildUsernameSeeds(input: { name: string; email: string }) {
  const emailLocalPart = input.email.split("@")[0] ?? "";
  const seeds = [input.name, emailLocalPart, "user"]
    .map(sanitizeUsername)
    .filter(Boolean);

  return Array.from(new Set(seeds));
}

export function normalizeUsername(value: string) {
  const normalized = sanitizeUsername(value);
  return normalized || "user";
}

export async function findAvailableUsername(
  client: UsernameClient,
  input: { name: string; email: string },
) {
  const seeds = buildUsernameSeeds(input);

  for (const seed of seeds) {
    const existingUser = await client.user.findUnique({
      where: {
        username: seed,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return seed;
    }
  }

  const base = seeds[0] ?? "user";

  for (let suffix = 2; suffix <= 9999; suffix += 1) {
    const candidate = `${base}_${suffix}`.slice(0, MAX_USERNAME_LENGTH);
    const existingUser = await client.user.findUnique({
      where: {
        username: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username.");
}
