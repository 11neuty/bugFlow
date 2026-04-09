import { forbidden, notFound } from "@/lib/errors";
import { formatIssueKey } from "@/lib/issues";
import { assertCanCommentOnIssue } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/types";
import { createAuditLog } from "@/services/audit-log-service";
import { resolveMentionedProjectMembers } from "@/services/comment-mentions-service";
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
  const { comment, issue } = await prisma.$transaction(async (tx) => {
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
        issueKey: formatIssueKey(issue.issueNumber),
        commentId: createdComment.id,
        preview:
          input.content.length > 140
            ? `${input.content.slice(0, 137)}...`
            : input.content,
      },
    });

    return {
      comment: createdComment,
      issue,
    };
  });

  if (issue.assigneeId && issue.assigneeId !== user.id) {
    await createNotification(prisma, {
      userId: issue.assigneeId,
      issueId,
      type: "ISSUE_COMMENTED",
      message: `New comment on ${formatIssueKey(issue.issueNumber)}`,
      dedupeKey: `issue-commented:${comment.id}:${issue.assigneeId}`,
    });
  }

  const mentionedMembers = await resolveMentionedProjectMembers(prisma, {
    content: input.content,
    projectId: issue.projectId,
    actorUserId: user.id,
  });

  for (const member of mentionedMembers) {
    await createNotification(prisma, {
      userId: member.user.id,
      issueId,
      type: "MENTIONED_IN_COMMENT",
      message: `You were mentioned in ${formatIssueKey(issue.issueNumber)}`,
      dedupeKey: `comment-mentioned:${comment.id}:${member.user.id}`,
    });
  }

  return {
    comment: serializeComment(comment),
  };
}

export async function updateComment(
  user: AuthUser,
  commentId: string,
  input: { content: string },
) {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    include: {
      issue: {
        select: {
          id: true,
          projectId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!comment || comment.issue.deletedAt) {
    throw notFound("Comment not found.");
  }

  const membership = await requireProjectMembership(
    prisma,
    user.id,
    comment.issue.projectId,
  );
  assertCanCommentOnIssue(membership.role);

  if (comment.userId !== user.id) {
    throw forbidden("You can only edit your own comments.");
  }

  const updatedComment = await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      content: input.content,
      editedAt: new Date(),
    },
    include: commentWithUserInclude,
  });

  return {
    comment: serializeComment(updatedComment),
  };
}
