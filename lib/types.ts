export type Role = "ADMIN" | "QA" | "DEVELOPER";
export type ProjectRole = "ADMIN" | "QA" | "DEVELOPER" | "VIEWER";
export type IssueStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CLOSED" | "REJECTED";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH";
export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AuditAction =
  | "ISSUE_CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "ASSIGNMENT_CHANGED"
  | "PRIORITY_CHANGED"
  | "COMMENT_ADDED"
  | "ISSUE_DELETED";
export type NotificationType =
  | "ISSUE_ASSIGNED"
  | "ISSUE_COMMENTED"
  | "ISSUE_STATUS_CHANGED";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface UserSummary extends AuthUser {
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  currentUserRole?: ProjectRole;
}

export interface ProjectDeletePayload {
  deleted: boolean;
  fallbackProject: ProjectSummary;
  movedIssueCount: number;
}

export interface IssueSummary {
  id: string;
  issueKey: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  version: number;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  assignee: UserSummary | null;
  reporter: UserSummary;
}

export interface CommentRecord {
  id: string;
  content: string;
  createdAt: string;
  user: UserSummary;
}

export interface NotificationIssueReference {
  id: string;
  issueKey: string;
  title: string;
  project: ProjectSummary;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  issue: NotificationIssueReference | null;
}

export interface AuditLogRecord {
  id: string;
  action: AuditAction;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: UserSummary;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
}

export interface IssueListPayload {
  issues: IssueSummary[];
  total: number;
  activeTotal: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IssueDetailPayload {
  issue: IssueSummary;
  comments: CommentRecord[];
  auditLogs: AuditLogRecord[];
  teamMembers: ProjectMemberUserSummary[];
}

export interface CommentListPayload {
  comments: CommentRecord[];
}

export interface NotificationUnreadCountPayload {
  unreadCount: number;
}

export interface ProjectMemberUserSummary extends UserSummary {
  projectRole: ProjectRole;
}

export interface ProjectMemberRecord {
  id: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
}

export interface ProjectMembersPayload {
  project: ProjectSummary;
  currentUserRole: ProjectRole;
  members: ProjectMemberRecord[];
  availableUsers: UserSummary[];
}

export interface StatusMetric {
  status: IssueStatus;
  count: number;
}

export interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface MetricsOverviewPayload {
  project: ProjectSummary;
  totalIssues: number;
  activeIssues: number;
  completedIssues: number;
  averageResolutionHours: number | null;
  averageResolutionDays: number | null;
  resolutionSampleSize: number;
  statusBreakdown: StatusMetric[];
  trend: TrendPoint[];
}

export interface IssueFilters {
  page?: number;
  limit?: number;
  projectId?: string;
  q?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  severity?: IssueSeverity;
  assigneeId?: string;
  sortBy?: "createdAt" | "updatedAt" | "priority";
  sortOrder?: "asc" | "desc";
}
