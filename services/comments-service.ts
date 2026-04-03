import { notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/types";
import { createAuditLog } from "@/services/audit-log-service";
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
  const comment = await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.findFirst({
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

    const createdComment = await tx.comment.create({
      data: {
        issueId,
        userId: user.id,
        content: input.content,
      },
      include: commentWithUserInclude,
    });

    await createAuditLog(tx, {
      issueId,
      userId: user.id,
      action: "COMMENT_ADDED",
      metadata: {
        commentId: createdComment.id,
        preview:
          input.content.length > 140
            ? `${input.content.slice(0, 137)}...`
            : input.content,
      },
    });

    return createdComment;
  });

  return {
    comment: serializeComment(comment),
  };
}
