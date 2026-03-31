import { forbidden } from "@/lib/errors";
import type { AuthUser, IssueStatus } from "@/lib/types";

interface IssueAccessRecord {
  reporterId: string;
  assigneeId: string | null;
  status: IssueStatus;
}

export function canEditIssue(user: AuthUser, issue: IssueAccessRecord) {
  if (user.role === "ADMIN" || user.role === "QA") {
    return true;
  }

  return issue.reporterId === user.id || issue.assigneeId === user.id;
}

export function canDeleteIssue(user: AuthUser) {
  return user.role === "ADMIN";
}

export function canAssignIssue(user: AuthUser, issue: IssueAccessRecord) {
  return user.role === "ADMIN" || user.role === "QA" || issue.reporterId === user.id;
}

export function assertCanEditIssue(user: AuthUser, issue: IssueAccessRecord) {
  if (!canEditIssue(user, issue)) {
    throw forbidden("You do not have permission to update this issue.");
  }
}

export function assertCanDeleteIssue(user: AuthUser) {
  if (!canDeleteIssue(user)) {
    throw forbidden("You do not have permission to delete this issue.");
  }
}

export function assertCanAssignIssue(user: AuthUser, issue: IssueAccessRecord) {
  if (!canAssignIssue(user, issue)) {
    throw forbidden("You do not have permission to reassign this issue.");
  }
}

export function validateStatusTransition(
  user: AuthUser,
  issue: IssueAccessRecord,
  nextStatus: IssueStatus,
) {
  if (issue.status === nextStatus) {
    return;
  }

  if (user.role === "ADMIN" || user.role === "QA") {
    return;
  }

  const isAssignee = issue.assigneeId === user.id;

  if (!isAssignee) {
    throw forbidden("Only the assignee can move this issue through the workflow.");
  }

  const allowedTransitions: Record<IssueStatus, IssueStatus[]> = {
    TODO: ["IN_PROGRESS", "CLOSED", "REJECTED"],
    IN_PROGRESS: ["TODO", "CLOSED", "REJECTED"],
    CLOSED: ["TODO"],
    REJECTED: ["TODO"],
  };

  if (!allowedTransitions[issue.status].includes(nextStatus)) {
    throw forbidden("That status transition is not allowed.");
  }
}
