import type { Prisma } from "@prisma/client";

import { formatIssueKey } from "@/lib/issues";
import type {
  AuditLogRecord,
  CommentRecord,
  IssueSummary,
  UserSummary,
} from "@/lib/types";

export const userSummarySelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const issueSummaryInclude = {
  assignee: {
    select: userSummarySelect,
  },
  reporter: {
    select: userSummarySelect,
  },
} satisfies Prisma.IssueInclude;

export const commentWithUserInclude = {
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.CommentInclude;

export const auditLogWithUserInclude = {
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.AuditLogInclude;

type SerializedUser = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

type SerializedIssue = Prisma.IssueGetPayload<{
  include: typeof issueSummaryInclude;
}>;

type SerializedComment = Prisma.CommentGetPayload<{
  include: typeof commentWithUserInclude;
}>;

type SerializedAuditLog = Prisma.AuditLogGetPayload<{
  include: typeof auditLogWithUserInclude;
}>;

function normalizeAuditMetadata(
  metadata: Prisma.JsonValue | null,
  userNameById: ReadonlyMap<string, string>,
) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if ((key === "from" || key === "to") && value === null) {
        return [key, "Unassigned"];
      }

      if (typeof value === "string") {
        return [key, userNameById.get(value) ?? value];
      }

      return [key, value];
    }),
  );
}

export function serializeUser(user: SerializedUser): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeIssue(issue: SerializedIssue): IssueSummary {
  return {
    id: issue.id,
    issueKey: formatIssueKey(issue.issueNumber),
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    severity: issue.severity,
    version: issue.version,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    assignee: issue.assignee ? serializeUser(issue.assignee) : null,
    reporter: serializeUser(issue.reporter),
  };
}

export function serializeComment(comment: SerializedComment): CommentRecord {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    user: serializeUser(comment.user),
  };
}

export function serializeAuditLog(
  log: SerializedAuditLog,
  userNameById: ReadonlyMap<string, string> = new Map(),
): AuditLogRecord {
  return {
    id: log.id,
    action: log.action,
    metadata: normalizeAuditMetadata(log.metadata, userNameById),
    createdAt: log.createdAt.toISOString(),
    user: serializeUser(log.user),
  };
}
