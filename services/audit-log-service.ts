import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";

import { ACTIVITY_LOG_LIMIT } from "@/lib/constants";
import { notFound } from "@/lib/errors";
import type { AuditLogRecord } from "@/lib/types";
import {
  auditLogWithUserInclude,
  serializeAuditLog,
  userSummarySelect,
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
  issueId: string,
): Promise<AuditLogRecord[]> {
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
    prisma.user.findMany({
      orderBy: {
        name: "asc",
      },
      select: userSummarySelect,
    }),
  ]);

  const userNameById = new Map(teamMembers.map((member) => [member.id, member.name]));
  return logs.map((log) => serializeAuditLog(log, userNameById));
}
