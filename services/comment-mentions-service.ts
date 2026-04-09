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

  const projectMembers = await client.projectMember.findMany({
    where: {
      projectId: input.projectId,
      userId: {
        not: input.actorUserId,
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

  const allowedUsernames = new Set(usernames);

  return projectMembers.filter((member) =>
    allowedUsernames.has(member.user.username.toLowerCase()),
  );
}
