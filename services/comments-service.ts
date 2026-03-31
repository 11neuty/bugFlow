import { notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/types";
import { commentWithUserInclude, serializeComment } from "@/services/serializers";

async function ensureIssueExists(issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!issue) {
    throw notFound("Issue not found.");
  }
}

export async function listComments(issueId: string) {
  await ensureIssueExists(issueId);

  const comments = await prisma.comment.findMany({
    where: {
      issueId,
    },
    include: commentWithUserInclude,
    orderBy: {
      createdAt: "asc",
    },
  });

  return {
    comments: comments.map(serializeComment),
  };
}

export async function createComment(
  user: AuthUser,
  issueId: string,
  input: { content: string },
) {
  await ensureIssueExists(issueId);

  const comment = await prisma.comment.create({
    data: {
      issueId,
      userId: user.id,
      content: input.content,
    },
    include: commentWithUserInclude,
  });

  return {
    comment: serializeComment(comment),
  };
}
