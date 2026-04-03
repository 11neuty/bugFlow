import type { Prisma } from "@prisma/client";

import { badRequest, conflict, notFound } from "@/lib/errors";
import { formatIssueKey } from "@/lib/issues";
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
  getOrCreateDefaultProject,
  getProjectById,
} from "@/services/project-service";
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

const INACTIVE_ISSUE_STATUSES: IssueSummary["status"][] = ["CLOSED", "REJECTED"];

function extractIssueNumber(query?: string) {
  if (!query) {
    return null;
  }

  const normalized = query.trim().toUpperCase();
  const prefixedMatch = normalized.match(/\bDF-(\d{1,})\b/);

  if (prefixedMatch) {
    return Number.parseInt(prefixedMatch[1], 10);
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  return null;
}

function buildIssueWhere(
  filters: IssueFilters,
  options: {
    activeOnly?: boolean;
    ignoreStatus?: boolean;
  } = {},
): Prisma.IssueWhereInput {
  const issueNumber = extractIssueNumber(filters.q);

  const status = options.activeOnly
    ? {
        notIn: INACTIVE_ISSUE_STATUSES,
      }
    : options.ignoreStatus
      ? undefined
      : filters.status;

  return {
    deletedAt: null,
    projectId: filters.projectId,
    status,
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
            ...(issueNumber
              ? [
                  {
                    issueNumber,
                  },
                ]
              : []),
          ],
        }
      : {}),
  };
}

async function resolveAssignee(user: AuthUser, assigneeId?: string | null) {
  if (!assigneeId) {
    return null;
  }

  const assignee = await prisma.user.findUnique({
    where: {
      id: assigneeId,
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  if (!assignee) {
    throw notFound("Assignee not found.");
  }

  if (
    (user.role === "ADMIN" || user.role === "QA") &&
    assignee.role === "ADMIN"
  ) {
    throw badRequest("Admins and QA cannot assign issues to admin users.");
  }

  return assignee;
}

async function resolveProject(projectId?: string | null) {
  if (!projectId) {
    console.warn("projectId missing, using default project");
    return getOrCreateDefaultProject();
  }

  return getProjectById(projectId);
}

export async function listIssues(filters: IssueFilters) {
  if (filters.projectId) {
    await getProjectById(filters.projectId);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const skip = (page - 1) * limit;
  const where = buildIssueWhere(filters);
  const activeWhere = buildIssueWhere(filters, {
    activeOnly: true,
    ignoreStatus: true,
  });

  const [issues, total, activeTotal] = await prisma.$transaction([
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
    prisma.issue.count({ where: activeWhere }),
  ]);

  return {
    issues: issues.map(serializeIssue),
    total,
    activeTotal,
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
    projectId?: string;
    assigneeId?: string;
  },
) {
  const project = await resolveProject(input.projectId);
  const assignee = await resolveAssignee(user, input.assigneeId);

  const issue = await prisma.$transaction(async (tx) => {
    const createdIssue = await tx.issue.create({
      data: {
        title: input.title,
        description: input.description,
        projectId: project.id,
        priority: input.priority,
        severity: input.severity,
        assigneeId: assignee?.id ?? null,
        reporterId: user.id,
      },
      include: issueSummaryInclude,
    });

    await createAuditLog(tx, {
      issueId: createdIssue.id,
      userId: user.id,
      action: "ISSUE_CREATED",
      metadata: {
        title: `${formatIssueKey(createdIssue.issueNumber)} ${createdIssue.title}`,
        status: createdIssue.status,
        assignee: assignee?.name ?? "Unassigned",
        project: project.name,
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

  const userNameById = new Map(teamMembers.map((member) => [member.id, member.name]));

  return {
    issue: serializeIssue(issue),
    comments: issue.comments.map(serializeComment),
    auditLogs: issue.auditLogs.map((log) => serializeAuditLog(log, userNameById)),
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
  }

  const nextAssignee =
    input.assigneeId !== undefined && input.assigneeId !== existingIssue.assigneeId
      ? await resolveAssignee(user, input.assigneeId)
      : undefined;

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
          ? { assigneeId: nextAssignee?.id ?? null }
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
          from: existingIssue.assignee?.name ?? null,
          to: nextIssue.assignee?.name ?? null,
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

  assertCanDeleteIssue(user);

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
