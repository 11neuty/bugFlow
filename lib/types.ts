export type Role = "ADMIN" | "QA" | "DEVELOPER";
export type IssueStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CLOSED" | "REJECTED";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH";
export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AuditAction =
  | "ISSUE_CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNMENT_CHANGED"
  | "ISSUE_DELETED";

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
  assignee: UserSummary | null;
  reporter: UserSummary;
}

export interface CommentRecord {
  id: string;
  content: string;
  createdAt: string;
  user: UserSummary;
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
  teamMembers: UserSummary[];
}

export interface CommentListPayload {
  comments: CommentRecord[];
}

export interface IssueFilters {
  page?: number;
  limit?: number;
  q?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  severity?: IssueSeverity;
  assigneeId?: string;
  sortBy?: "createdAt" | "updatedAt" | "priority";
  sortOrder?: "asc" | "desc";
}
