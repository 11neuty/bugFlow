import { forbidden } from "@/lib/errors";
import type { IssueStatus, ProjectRole } from "@/lib/types";

interface IssueAccessRecord {
  reporterId: string;
  assigneeId: string | null;
  status: IssueStatus;
}

export function canCreateIssue(projectRole: ProjectRole) {
  return (
    projectRole === "ADMIN" ||
    projectRole === "DEVELOPER" ||
    projectRole === "QA"
  );
}

export function canCommentOnIssue(projectRole: ProjectRole) {
  return projectRole !== "VIEWER";
}

export function canReceiveNotification(projectRole: ProjectRole) {
  return projectRole !== "VIEWER";
}

export function canEditIssue(
  userId: string,
  projectRole: ProjectRole,
  issue: IssueAccessRecord,
) {
  if (projectRole === "ADMIN" || projectRole === "QA") {
    return true;
  }

  if (projectRole === "VIEWER") {
    return false;
  }

  return issue.reporterId === userId || issue.assigneeId === userId;
}

export function canDeleteIssue(projectRole: ProjectRole) {
  return projectRole === "ADMIN";
}

export function canAssignIssue(
  userId: string,
  projectRole: ProjectRole,
  issue: IssueAccessRecord,
) {
  return (
    projectRole === "ADMIN" ||
    projectRole === "QA" ||
    (projectRole === "DEVELOPER" && issue.reporterId === userId)
  );
}

export function assertCanCreateIssue(projectRole: ProjectRole) {
  if (!canCreateIssue(projectRole)) {
    throw forbidden("You do not have permission to create issues in this project.");
  }
}

export function assertCanCommentOnIssue(projectRole: ProjectRole) {
  if (!canCommentOnIssue(projectRole)) {
    throw forbidden("You do not have permission to comment in this project.");
  }
}

export function assertCanEditIssue(
  userId: string,
  projectRole: ProjectRole,
  issue: IssueAccessRecord,
) {
  if (!canEditIssue(userId, projectRole, issue)) {
    throw forbidden("You do not have permission to update this issue.");
  }
}

export function assertCanDeleteIssue(projectRole: ProjectRole) {
  if (!canDeleteIssue(projectRole)) {
    throw forbidden("You do not have permission to delete this issue.");
  }
}

export function assertCanAssignIssue(
  userId: string,
  projectRole: ProjectRole,
  issue: IssueAccessRecord,
) {
  if (!canAssignIssue(userId, projectRole, issue)) {
    throw forbidden("You do not have permission to reassign this issue.");
  }
}

export function validateStatusTransition(
  userId: string,
  projectRole: ProjectRole,
  issue: IssueAccessRecord,
  nextStatus: IssueStatus,
) {
  if (issue.status === nextStatus) {
    return;
  }

  if (projectRole === "ADMIN" || projectRole === "QA") {
    return;
  }

  if (projectRole === "VIEWER") {
    throw forbidden("You do not have permission to change issue status.");
  }

  const isAssignee = issue.assigneeId === userId;

  if (!isAssignee) {
    throw forbidden("Only the assignee can move this issue through the workflow.");
  }

  const allowedTransitions: Record<IssueStatus, IssueStatus[]> = {
    TODO: ["IN_PROGRESS"],
    IN_PROGRESS: ["TODO", "DONE"],
    DONE: ["IN_PROGRESS"],
    CLOSED: [],
    REJECTED: [],
  };

  if (!allowedTransitions[issue.status].includes(nextStatus)) {
    throw forbidden("That status transition is not allowed.");
  }
}
