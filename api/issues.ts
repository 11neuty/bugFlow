import type {
  AuditLogRecord,
  CommentListPayload,
  IssueDetailPayload,
  IssueFilters,
  IssueRelationRecord,
  IssueListPayload,
  IssueSummary,
} from "@/lib/types";

export type AuthorizedFetcher = <T>(
  path: string,
  init?: RequestInit,
) => Promise<T>;

function buildIssueQuery(filters: IssueFilters) {
  const params = new URLSearchParams();

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  if (filters.projectId) {
    params.set("projectId", filters.projectId);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.severity) {
    params.set("severity", filters.severity);
  }

  if (filters.assigneeId) {
    params.set("assigneeId", filters.assigneeId);
  }

  if (filters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.sortOrder) {
    params.set("sortOrder", filters.sortOrder);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function fetchIssues(
  authorizedFetch: AuthorizedFetcher,
  filters: IssueFilters,
) {
  return authorizedFetch<IssueListPayload>(
    `/api/v1/issues${buildIssueQuery(filters)}`,
  );
}

export function createIssueRequest(
  authorizedFetch: AuthorizedFetcher,
  input: {
    title: string;
    description: string;
    priority: IssueSummary["priority"];
    severity: IssueSummary["severity"];
    projectId?: string;
    assigneeId?: string;
  },
) {
  return authorizedFetch<{ issue: IssueSummary }>("/api/v1/issues", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function fetchIssueDetail(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
) {
  return authorizedFetch<IssueDetailPayload>(`/api/v1/issues/${issueId}`);
}

export function fetchIssueActivity(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
) {
  return authorizedFetch<AuditLogRecord[]>(`/api/v1/issues/${issueId}/activity`);
}

export function updateIssueRequest(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
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
  return authorizedFetch<{ issue: IssueSummary }>(`/api/v1/issues/${issueId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function deleteIssueRequest(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
) {
  return authorizedFetch<{ deleted: boolean }>(`/api/v1/issues/${issueId}`, {
    method: "DELETE",
  });
}

export function fetchComments(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
) {
  return authorizedFetch<CommentListPayload>(`/api/v1/issues/${issueId}/comments`);
}

export function createCommentRequest(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
  content: string,
) {
  return authorizedFetch<{ comment: CommentListPayload["comments"][number] }>(
    `/api/v1/issues/${issueId}/comments`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );
}

export function updateCommentRequest(
  authorizedFetch: AuthorizedFetcher,
  commentId: string,
  content: string,
) {
  return authorizedFetch<{ comment: CommentListPayload["comments"][number] }>(
    `/api/v1/comments/${commentId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );
}

export function createIssueRelationRequest(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
  input: {
    targetIssueId: string;
    type: Extract<IssueRelationRecord["type"], "BLOCKS" | "RELATES_TO" | "DUPLICATES">;
  },
) {
  return authorizedFetch<{ relation: IssueRelationRecord }>(
    `/api/v1/issues/${issueId}/relations`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export function deleteIssueRelationRequest(
  authorizedFetch: AuthorizedFetcher,
  issueId: string,
  relationId: string,
) {
  return authorizedFetch<{ deleted: boolean }>(
    `/api/v1/issues/${issueId}/relations/${relationId}`,
    {
      method: "DELETE",
    },
  );
}
