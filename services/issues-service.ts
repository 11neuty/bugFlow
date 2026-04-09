import type { Prisma } from "@prisma/client";

import { ACTIVITY_LOG_LIMIT, ISSUE_RELATION_LIMIT } from "@/lib/constants";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { formatIssueKey } from "@/lib/issues";
import {
  assertCanCreateIssue,
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
import { createNotification } from "@/services/notification-service";
import {
  ensureUserHasProjectMembership,
  getOrCreateDefaultProject,
  getProjectById,
} from "@/services/project-service";
import { requireProjectMembership } from "@/services/project-members-service";
import {
  auditLogWithUserInclude,
  commentWithUserInclude,
  issueSummaryInclude,
  projectMemberWithUserInclude,
  issueRelationInclude,
  serializeAuditLog,
  serializeComment,
  serializeIssue,
  serializeIssueRelation,
  serializeProjectMemberUser,
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

async function resolveAssignee(
  actorProjectRole: "ADMIN" | "QA" | "DEVELOPER" | "VIEWER",
  projectId: string,
  assigneeId?: string | null,
) {
  if (!assigneeId) {
    return null;
  }

  const assignee = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: assigneeId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!assignee) {
    throw badRequest("Assignee must be a member of this project.");
  }

  if (
    (actorProjectRole === "ADMIN" || actorProjectRole === "QA") &&
    assignee.role === "ADMIN"
  ) {
    throw badRequest("Admins and QA cannot assign issues to admin users.");
  }

  return assignee.user;
}

async function resolveProject(user: AuthUser, projectId?: string | null) {
  if (!projectId) {
    console.warn("projectId missing, using default project");
    await ensureUserHasProjectMembership(user);
    const defaultProject = await getOrCreateDefaultProject();
    return getProjectById(user, defaultProject.id);
  }

  return getProjectById(user, projectId);
}

export async function listIssues(user: AuthUser, filters: IssueFilters) {
  if (!filters.projectId) {
    throw badRequest("Project is required.");
  }

  await requireProjectMembership(prisma, user.id, filters.projectId);

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
  const project = await resolveProject(user, input.projectId);
  const membership = await requireProjectMembership(prisma, user.id, project.id);
  assertCanCreateIssue(membership.role);
  const assignee = await resolveAssignee(membership.role, project.id, input.assigneeId);

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
        issueKey: formatIssueKey(createdIssue.issueNumber),
        title: createdIssue.title,
      },
    });

    if (assignee?.id && assignee.id !== user.id) {
      await createNotification(tx, {
        userId: assignee.id,
        issueId: createdIssue.id,
        type: "ISSUE_ASSIGNED",
        message: `You were assigned to issue ${formatIssueKey(createdIssue.issueNumber)}`,
        dedupeKey: `issue-assigned:create:${createdIssue.id}:${assignee.id}`,
      });
    }

    return createdIssue;
  });

  return {
    issue: serializeIssue(issue),
  };
}

export async function getIssueDetail(
  user: AuthUser,
  id: string,
): Promise<IssueDetailPayload> {
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
        take: ACTIVITY_LOG_LIMIT,
      },
      sourceRelations: {
        where: {
          targetIssue: {
            deletedAt: null,
          },
        },
        include: issueRelationInclude,
        orderBy: {
          createdAt: "desc",
        },
        take: ISSUE_RELATION_LIMIT,
      },
      targetRelations: {
        where: {
          sourceIssue: {
            deletedAt: null,
          },
        },
        include: issueRelationInclude,
        orderBy: {
          createdAt: "desc",
        },
        take: ISSUE_RELATION_LIMIT,
      },
    },
  });

  if (!issue) {
    throw notFound("Issue not found.");
  }

  await requireProjectMembership(prisma, user.id, issue.projectId);

  const teamMembers = await prisma.projectMember.findMany({
    where: {
      projectId: issue.projectId,
    },
    include: projectMemberWithUserInclude,
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  const userNameById = new Map(
    teamMembers.map((member) => [member.user.id, member.user.name]),
  );

  return {
    issue: serializeIssue(issue),
    comments: issue.comments.map(serializeComment),
    auditLogs: issue.auditLogs.map((log) => serializeAuditLog(log, userNameById)),
    teamMembers: teamMembers.map(serializeProjectMemberUser),
    relations: [...issue.sourceRelations, ...issue.targetRelations]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, ISSUE_RELATION_LIMIT)
      .map((relation) => serializeIssueRelation(relation, issue.id)),
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

  const membership = await requireProjectMembership(prisma, user.id, existingIssue.projectId);
  assertCanEditIssue(user.id, membership.role, existingIssue);

  if (
    input.assigneeId !== undefined &&
    input.assigneeId !== existingIssue.assigneeId
  ) {
    assertCanAssignIssue(user.id, membership.role, existingIssue);
  }

  const nextAssignee =
    input.assigneeId !== undefined && input.assigneeId !== existingIssue.assigneeId
      ? await resolveAssignee(membership.role, existingIssue.projectId, input.assigneeId)
      : undefined;

  if (input.status) {
    validateStatusTransition(user.id, membership.role, existingIssue, input.status);
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
        action: "ASSIGNED",
        metadata: {
          from: existingIssue.assignee?.name ?? null,
          to: nextIssue.assignee?.name ?? null,
        },
      });

      if (nextIssue.assigneeId && nextIssue.assigneeId !== user.id) {
        await createNotification(tx, {
          userId: nextIssue.assigneeId,
          issueId: id,
          type: "ISSUE_ASSIGNED",
          message: `You were assigned to issue ${formatIssueKey(nextIssue.issueNumber)}`,
          dedupeKey: `issue-assigned:update:${id}:${nextIssue.version}:${nextIssue.assigneeId}`,
        });
      }
    }

    if (input.priority && input.priority !== existingIssue.priority) {
      await createAuditLog(tx, {
        issueId: id,
        userId: user.id,
        action: "PRIORITY_CHANGED",
        metadata: {
          from: existingIssue.priority,
          to: input.priority,
        },
      });
    }

    if (
      input.status &&
      input.status !== existingIssue.status &&
      nextIssue.assigneeId &&
      nextIssue.assigneeId !== user.id
    ) {
      await createNotification(tx, {
        userId: nextIssue.assigneeId,
        issueId: id,
        type: "ISSUE_STATUS_CHANGED",
        message: `Status changed to ${input.status}`,
        dedupeKey: `issue-status:${id}:${nextIssue.version}:${input.status}:${nextIssue.assigneeId}`,
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

  const membership = await requireProjectMembership(prisma, user.id, issue.projectId);
  assertCanDeleteIssue(membership.role);

  await prisma.$transaction(async (tx) => {
    await tx.issueRelation.deleteMany({
      where: {
        OR: [
          {
            sourceIssueId: id,
          },
          {
            targetIssueId: id,
          },
        ],
      },
    });

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
