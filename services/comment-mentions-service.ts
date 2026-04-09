import type { Prisma, PrismaClient } from "@prisma/client";

import { extractMentionUsernames } from "@/lib/comments";

type MentionClient = Prisma.TransactionClient | PrismaClient;

export async function resolveMentionedProjectMembers(
  client: MentionClient,
  input: {
    content: string;
    projectId: string;
    actorUserId: string;
  },
) {
  const usernames = extractMentionUsernames(input.content);

  if (usernames.length === 0) {
    return [];
  }

  return client.projectMember.findMany({
    where: {
      projectId: input.projectId,
      userId: {
        not: input.actorUserId,
      },
      user: {
        username: {
          in: usernames,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
}
