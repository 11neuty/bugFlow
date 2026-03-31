import bcrypt from "bcrypt";

import { MAX_ACTIVE_REFRESH_TOKENS, REFRESH_TOKEN_TTL_SECONDS } from "@/lib/constants";
import { badRequest, unauthorized } from "@/lib/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { AuthPayload, AuthUser, UserSummary } from "@/lib/types";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } satisfies AuthUser;
}

function toUserSummary(user: {
  id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  createdAt: Date;
}) {
  return {
    ...toAuthUser(user),
    createdAt: user.createdAt.toISOString(),
  } satisfies UserSummary;
}

async function persistRefreshToken(user: AuthUser, token: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.$transaction(async (tx) => {
    const activeTokens = await tx.refreshToken.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const overflow = activeTokens.length - (MAX_ACTIVE_REFRESH_TOKENS - 1);

    if (overflow >= 0) {
      const tokenIds = activeTokens.slice(0, overflow + 1).map((item) => item.id);

      if (tokenIds.length > 0) {
        await tx.refreshToken.updateMany({
          where: {
            id: {
              in: tokenIds,
            },
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }
    }

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
  });

  return expiresAt;
}

async function buildAuthPayload(user: AuthUser): Promise<AuthPayload & { refreshToken: string }> {
  const accessToken = await signAccessToken(user);
  const refreshToken = await signRefreshToken(user);

  await persistRefreshToken(user, refreshToken);

  return {
    user,
    accessToken,
    refreshToken,
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: AuthUser["role"];
}) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw badRequest("An account with that email already exists.");
  }

  const password = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password,
      role: input.role,
    },
  });

  return {
    user: toUserSummary(user),
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw unauthorized("Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw unauthorized("Invalid email or password.");
  }

  return buildAuthPayload(toAuthUser(user));
}

export async function refreshAuthToken(token: string) {
  const payload = await verifyRefreshToken(token);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.updateMany({
      where: {
        userId: payload.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    throw unauthorized("Your session has expired. Please sign in again.");
  }

  const user = toAuthUser(storedToken.user);
  const accessToken = await signAccessToken(user);
  const refreshToken = await signRefreshToken(user);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
}

export async function logoutUser(token?: string | null) {
  if (!token) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      token,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
