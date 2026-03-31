import type { Prisma } from "@prisma/client";

import { conflict, notFound } from "@/lib/errors";
import {
  assertCanAssignIssue,
  assertCanDeleteIssue,
  assertCanEditIssue,
  validateStatusTransition,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  AuthUser,
  IssueDetailPayload,
  IssueFilters,
  IssueSummary,
} from "@/lib/types";
import { createAuditLog } from "@/services/audit-log-service";
import {
  auditLogWithUserInclude,
  commentWithUserInclude,
  issueSummaryInclude,
  serializeAuditLog,
  serializeComment,
  serializeIssue,
  serializeUser,
  userSummarySelect,
} from "@/services/serializers";

function buildIssueWhere(filters: IssueFilters): Prisma.IssueWhereInput {
  return {
    deletedAt: null,
    status: filters.status,
    priority: filters.priority,
    severity: filters.severity,
    assigneeId: filters.assigneeId,
    ...(filters.q
      ? {
          OR: [
            {
              title: {
                contains: filters.q,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: filters.q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}

export async function listIssues(filters: IssueFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const skip = (page - 1) * limit;
  const where = buildIssueWhere(filters);

  const [issues, total] = await prisma.$transaction([
    prisma.issue.findMany({
      where,
      include: issueSummaryInclude,
      orderBy: {
        [filters.sortBy ?? "updatedAt"]: filters.sortOrder ?? "desc",
      },
      skip,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  return {
    issues: issues.map(serializeIssue),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function createIssue(
  user: AuthUser,
  input: {
    title: string;
    description: string;
    priority: IssueSummary["priority"];
    severity: IssueSummary["severity"];
    assigneeId?: string;
  },
) {
  const issue = await prisma.$transaction(async (tx) => {
    if (input.assigneeId) {
      await tx.user.findUniqueOrThrow({
        where: {
          id: input.assigneeId,
        },
        select: {
          id: true,
        },
      });
    }

    const createdIssue = await tx.issue.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        severity: input.severity,
        assigneeId: input.assigneeId ?? null,
        reporterId: user.id,
      },
      include: issueSummaryInclude,
    });

    await createAuditLog(tx, {
      issueId: createdIssue.id,
      userId: user.id,
      action: "ISSUE_CREATED",
      metadata: {
        title: createdIssue.title,
        status: createdIssue.status,
      },
    });

    return createdIssue;
  });

  return {
    issue: serializeIssue(issue),
  };
}

export async function getIssueDetail(id: string): Promise<IssueDetailPayload> {
  const issue = await prisma.issue.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      ...issueSummaryInclude,
      comments: {
        include: commentWithUserInclude,
        orderBy: {
          createdAt: "asc",
        },
      },
      auditLogs: {
        include: auditLogWithUserInclude,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!issue) {
    throw notFound("Issue not found.");
  }

  const teamMembers = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
    select: userSummarySelect,
  });

  return {
    issue: serializeIssue(issue),
    comments: issue.comments.map(serializeComment),
    auditLogs: issue.auditLogs.map(serializeAuditLog),
    teamMembers: teamMembers.map(serializeUser),
  };
}

export async function updateIssue(
  user: AuthUser,
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: IssueSummary["status"];
    priority?: IssueSummary["priority"];
    severity?: IssueSummary["severity"];
    assigneeId?: string | null;
    version: number;
  },
) {
  const existingIssue = await prisma.issue.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: issueSummaryInclude,
  });

  if (!existingIssue) {
    throw notFound("Issue not found.");
  }

  assertCanEditIssue(user, existingIssue);

  if (
    input.assigneeId !== undefined &&
    input.assigneeId !== existingIssue.assigneeId
  ) {
    assertCanAssignIssue(user, existingIssue);

    if (input.assigneeId) {
      await prisma.user.findUniqueOrThrow({
        where: {
          id: input.assigneeId,
        },
        select: {
          id: true,
        },
      });
    }
  }

  if (input.status) {
    validateStatusTransition(user, existingIssue, input.status);
  }

  const updatedIssue = await prisma.$transaction(async (tx) => {
    const result = await tx.issue.updateMany({
      where: {
        id,
        version: input.version,
        deletedAt: null,
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId }
          : {}),
        version: {
          increment: 1,
        },
      },
    });

    if (result.count === 0) {
      throw conflict("This issue was updated by someone else. Refresh and try again.");
    }

    const nextIssue = await tx.issue.findUniqueOrThrow({
      where: {
        id,
      },
      include: issueSummaryInclude,
    });

    if (input.status && input.status !== existingIssue.status) {
      await createAuditLog(tx, {
        issueId: id,
        userId: user.id,
        action: "STATUS_CHANGED",
        metadata: {
          from: existingIssue.status,
          to: input.status,
        },
      });
    }

    if (input.assigneeId !== undefined && input.assigneeId !== existingIssue.assigneeId) {
      await createAuditLog(tx, {
        issueId: id,
        userId: user.id,
        action: "ASSIGNMENT_CHANGED",
        metadata: {
          from: existingIssue.assigneeId,
          to: input.assigneeId,
        },
      });
    }

    return nextIssue;
  });

  return {
    issue: serializeIssue(updatedIssue),
  };
}

export async function deleteIssue(user: AuthUser, id: string) {
  const issue = await prisma.issue.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: issueSummaryInclude,
  });

  if (!issue) {
    throw notFound("Issue not found.");
  }

  assertCanDeleteIssue(user, issue);

  await prisma.$transaction(async (tx) => {
    await tx.issue.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    await createAuditLog(tx, {
      issueId: id,
      userId: user.id,
      action: "ISSUE_DELETED",
      metadata: {
        title: issue.title,
      },
    });
  });

  return {
    deleted: true,
  };
}
