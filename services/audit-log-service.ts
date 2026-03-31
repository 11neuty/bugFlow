import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

interface CreateAuditLogInput {
  issueId: string;
  userId: string;
  action: "ISSUE_CREATED" | "STATUS_CHANGED" | "ASSIGNMENT_CHANGED" | "ISSUE_DELETED";
  metadata?: Prisma.InputJsonValue;
}

export function createAuditLog(
  tx: TransactionClient,
  input: CreateAuditLogInput,
) {
  return tx.auditLog.create({
    data: {
      issueId: input.issueId,
      userId: input.userId,
      action: input.action,
      metadata: input.metadata,
    },
  });
}
