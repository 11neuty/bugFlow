import { notFound } from "@/lib/errors";
import { formatIssueKey } from "@/lib/issues";
import { assertCanCommentOnIssue } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/types";
import { createAuditLog } from "@/services/audit-log-service";
import { createNotification } from "@/services/notification-service";
import { requireProjectMembership } from "@/services/project-members-service";
import { commentWithUserInclude, serializeComment } from "@/services/serializers";

async function ensureIssueExists(issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      deletedAt: null,
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!issue) {
    throw notFound("Issue not found.");
  }

  return issue;
}

export async function listComments(user: AuthUser, issueId: string) {
  const issue = await ensureIssueExists(issueId);
  await requireProjectMembership(prisma, user.id, issue.projectId);

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
        issueNumber: true,
        assigneeId: true,
        projectId: true,
      },
    });

    if (!issue) {
      throw notFound("Issue not found.");
    }

    const membership = await requireProjectMembership(tx, user.id, issue.projectId);
    assertCanCommentOnIssue(membership.role);

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

    if (issue.assigneeId && issue.assigneeId !== user.id) {
      await createNotification(tx, {
        userId: issue.assigneeId,
        issueId,
        type: "ISSUE_COMMENTED",
        message: `New comment on ${formatIssueKey(issue.issueNumber)}`,
        dedupeKey: `issue-commented:${createdComment.id}:${issue.assigneeId}`,
      });
    }

    return createdComment;
  });

  return {
    comment: serializeComment(comment),
  };
}
