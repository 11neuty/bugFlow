import type { Prisma } from "@prisma/client";

import { formatIssueKey } from "@/lib/issues";
import type {
  AuditLogRecord,
  CommentRecord,
  IssueRelationRecord,
  IssueRelationType,
  IssueSummary,
  NotificationIssueReference,
  NotificationRecord,
  ProjectMemberRecord,
  ProjectMemberUserSummary,
  ProjectRole,
  ProjectSummary,
  UserSummary,
} from "@/lib/types";

export const userSummarySelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const projectSummarySelect = {
  id: true,
  name: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;

export const issueSummaryInclude = {
  project: {
    select: projectSummarySelect,
  },
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

export const notificationWithIssueInclude = {
  issue: {
    select: {
      id: true,
      issueNumber: true,
      title: true,
      project: {
        select: projectSummarySelect,
      },
    },
  },
} satisfies Prisma.NotificationInclude;

export const projectMemberWithUserInclude = {
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.ProjectMemberInclude;

export const issueRelationInclude = {
  sourceIssue: {
    include: issueSummaryInclude,
  },
  targetIssue: {
    include: issueSummaryInclude,
  },
} satisfies Prisma.IssueRelationInclude;

type SerializedUser = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

type SerializedProject = Prisma.ProjectGetPayload<{
  select: typeof projectSummarySelect;
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

type SerializedNotification = Prisma.NotificationGetPayload<{
  include: typeof notificationWithIssueInclude;
}>;

type SerializedProjectMember = Prisma.ProjectMemberGetPayload<{
  include: typeof projectMemberWithUserInclude;
}>;

type SerializedIssueRelation = Prisma.IssueRelationGetPayload<{
  include: typeof issueRelationInclude;
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
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeProject(
  project: SerializedProject,
  options: { currentUserRole?: ProjectRole } = {},
): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
    currentUserRole: options.currentUserRole,
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
    project: serializeProject(issue.project),
    assignee: issue.assignee ? serializeUser(issue.assignee) : null,
    reporter: serializeUser(issue.reporter),
  };
}

export function serializeComment(comment: SerializedComment): CommentRecord {
  return {
    id: comment.id,
    content: comment.content,
    editedAt: comment.editedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    user: serializeUser(comment.user),
  };
}

function getRelatedIssue(
  relation: SerializedIssueRelation,
  issueId: string,
): { type: IssueRelationType; issue: SerializedIssue } {
  if (relation.sourceIssueId === issueId) {
    return {
      type: relation.type as Exclude<IssueRelationType, "BLOCKED_BY">,
      issue: relation.targetIssue,
    };
  }

  return {
    type: relation.type === "BLOCKS" ? "BLOCKED_BY" : (relation.type as IssueRelationType),
    issue: relation.sourceIssue,
  };
}

export function serializeIssueRelation(
  relation: SerializedIssueRelation,
  issueId: string,
): IssueRelationRecord {
  const related = getRelatedIssue(relation, issueId);

  return {
    id: relation.id,
    type: related.type,
    createdAt: relation.createdAt.toISOString(),
    relatedIssue: serializeIssue(related.issue),
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

function serializeNotificationIssue(
  issue: NonNullable<SerializedNotification["issue"]>,
): NotificationIssueReference {
  return {
    id: issue.id,
    issueKey: formatIssueKey(issue.issueNumber),
    title: issue.title,
    project: serializeProject(issue.project),
  };
}

export function serializeNotification(
  notification: SerializedNotification,
): NotificationRecord {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    issue: notification.issue ? serializeNotificationIssue(notification.issue) : null,
  };
}

export function serializeProjectMemberUser(
  member: SerializedProjectMember,
): ProjectMemberUserSummary {
  return {
    ...serializeUser(member.user),
    projectRole: member.role,
  };
}

export function serializeProjectMember(
  member: SerializedProjectMember,
): ProjectMemberRecord {
  return {
    id: member.id,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    user: serializeUser(member.user),
  };
}
