import { forbidden } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/types";
import { createUserAccount } from "@/services/auth-service";
import { serializeUser, userSummarySelect } from "@/services/serializers";

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
    select: userSummarySelect,
  });

  return {
    users: users.map(serializeUser),
  };
}

export async function createUser(
  currentUser: AuthUser,
  input: {
    name: string;
    email: string;
    password: string;
    role: AuthUser["role"];
  },
) {
  if (currentUser.role !== "ADMIN") {
    throw forbidden("Only admins can create users.");
  }

  return {
    user: await createUserAccount(input),
  };
}
