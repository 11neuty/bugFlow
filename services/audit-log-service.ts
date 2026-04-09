import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";

import { ACTIVITY_LOG_LIMIT } from "@/lib/constants";
import { notFound } from "@/lib/errors";
import type { AuditLogRecord, AuthUser } from "@/lib/types";
import { requireProjectMembership } from "@/services/project-members-service";
import {
  auditLogWithUserInclude,
  serializeAuditLog,
} from "@/services/serializers";

type AuditLogClient = Prisma.TransactionClient | PrismaClient;

interface CreateAuditLogInput {
  issueId: string;
  userId: string;
  action: AuditAction;
  metadata?: Prisma.InputJsonValue;
}

export function createAuditLog(
  client: AuditLogClient,
  input: CreateAuditLogInput,
) {
  return client.auditLog.create({
    data: {
      issueId: input.issueId,
      userId: input.userId,
      action: input.action,
      metadata: input.metadata,
    },
  });
}

export async function listIssueActivity(
  prisma: PrismaClient,
  user: AuthUser,
  issueId: string,
): Promise<AuditLogRecord[]> {
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

  await requireProjectMembership(prisma, user.id, issue.projectId);

  const [logs, teamMembers] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: {
        issueId,
      },
      include: auditLogWithUserInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: ACTIVITY_LOG_LIMIT,
    }),
    prisma.projectMember.findMany({
      where: {
        projectId: issue.projectId,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const userNameById = new Map(
    teamMembers.map((member) => [member.user.id, member.user.name]),
  );
  return logs.map((log) => serializeAuditLog(log, userNameById));
}
