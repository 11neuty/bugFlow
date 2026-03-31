import { prisma } from "@/lib/prisma";
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
