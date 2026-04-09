"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";

import {
  createCommentRequest,
  deleteIssueRequest,
  fetchIssueDetail,
  updateIssueRequest,
} from "@/api/issues";
import { ActivityTimeline } from "@/components/issues/ActivityTimeline";
import { useAuth } from "@/components/providers/AuthProvider";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useProjects } from "@/components/providers/ProjectProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { CommentComposer } from "@/components/issues/CommentComposer";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CommentRecord, IssueDetailPayload, IssueSummary } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type CommentSortOrder = "desc" | "asc";

function badgeToneForStatus(status: IssueSummary["status"]) {
  switch (status) {
    case "DONE":
      return "green";
    case "CLOSED":
      return "blue";
    case "REJECTED":
      return "red";
    case "IN_PROGRESS":
      return "amber";
    default:
      return "neutral";
  }
}

function badgeToneForSeverity(severity: IssueSummary["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return "red";
    case "HIGH":
      return "amber";
    case "MEDIUM":
      return "blue";
    default:
      return "neutral";
  }
}

function badgeToneForPriority(priority: IssueSummary["priority"]) {
  switch (priority) {
    case "HIGH":
      return "red";
    case "MEDIUM":
      return "amber";
    default:
      return "neutral";
  }
}

export function IssueDetailView({ issueId }: { issueId: string }) {
  const { authorizedFetch, isReady, user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const { selectProject, selectedProject, selectedProjectId } = useProjects();
  const { pushToast } = useToast();
  const [detail, setDetail] = useState<IssueDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentSortOrder, setCommentSortOrder] =
    useState<CommentSortOrder>("desc");

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    let cancelled = false;

    const loadIssue = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchIssueDetail(authorizedFetch, issueId);

        if (!cancelled) {
          setDetail(result);

          if (result.issue.project.id !== selectedProjectId) {
            selectProject(result.issue.project.id);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this issue.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [authorizedFetch, isReady, issueId, selectProject, selectedProjectId, user]);

  const reloadIssue = async () => {
    const result = await fetchIssueDetail(authorizedFetch, issueId);
    if (result.issue.project.id !== selectedProjectId) {
      selectProject(result.issue.project.id);
    }
    setDetail(result);
  };

  const sortedComments = detail
    ? [...detail.comments].sort((left: CommentRecord, right: CommentRecord) => {
        const leftTimestamp = new Date(left.createdAt).getTime();
        const rightTimestamp = new Date(right.createdAt).getTime();

        return commentSortOrder === "desc"
          ? rightTimestamp - leftTimestamp
          : leftTimestamp - rightTimestamp;
      })
    : [];
  const currentProjectRole =
    detail && selectedProject?.id === detail.issue.project.id
      ? selectedProject.currentUserRole
      : undefined;
  const restrictAdminAssignments =
    currentProjectRole === "ADMIN" || currentProjectRole === "QA";
  const assignableTeamMembers = detail
    ? detail.teamMembers.filter(
        (member) =>
          !restrictAdminAssignments ||
          member.projectRole !== "ADMIN" ||
          member.id === detail.issue.assignee?.id,
      )
    : [];

  return (
    <AppShell
      actions={
        <Link href="/dashboard">
          <Button leadingIcon={<ArrowLeft className="size-4" />} variant="secondary">
            Back to board
          </Button>
        </Link>
      }
      subtitle="Review the full handoff context, leave comments, and manage assignment or status changes with optimistic updates."
      title="Issue detail"
    >
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <Card className="min-h-96 animate-pulse bg-slate-100/80" />
          <Card className="min-h-96 animate-pulse bg-slate-100/80" />
        </div>
      ) : error || !detail ? (
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-slate-950">Issue unavailable</p>
          <p className="mt-2 text-sm text-slate-500">
            {error ?? "The issue could not be found."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{detail.issue.project.name}</Badge>
                  <Badge tone={badgeToneForStatus(detail.issue.status)}>
                    {detail.issue.status}
                  </Badge>
                  <Badge tone={badgeToneForPriority(detail.issue.priority)}>
                    {detail.issue.priority}
                  </Badge>
                  <Badge tone={badgeToneForSeverity(detail.issue.severity)}>
                    {detail.issue.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {detail.issue.issueKey}
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {detail.issue.title}
                  </h1>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {detail.issue.description}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Project
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {detail.issue.project.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Reporter
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {detail.issue.reporter.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {detail.issue.reporter.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Updated
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {formatDate(detail.issue.updatedAt)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Created {formatDate(detail.issue.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Comments</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep the handoff crisp so the next person can act quickly.
                  </p>
                </div>

                <label className="flex min-w-44 flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Sort by date</span>
                  <select
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
                    onChange={(event) =>
                      setCommentSortOrder(event.target.value as CommentSortOrder)
                    }
                    value={commentSortOrder}
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </label>
              </div>

              {currentProjectRole === "VIEWER" ? (
                <Card className="rounded-[24px] border border-dashed border-slate-200 p-5">
                  <p className="text-sm text-slate-500">
                    Viewers can read the discussion, but only project contributors can
                    add comments.
                  </p>
                </Card>
              ) : (
                <CommentComposer
                  onSubmit={async (content) => {
                    const result = await createCommentRequest(
                      authorizedFetch,
                      issueId,
                      content,
                    );

                    try {
                      await reloadIssue();
                    } catch {
                      setDetail((currentDetail) =>
                        currentDetail
                          ? {
                              ...currentDetail,
                              comments: [...currentDetail.comments, result.comment],
                            }
                          : currentDetail,
                      );
                    }

                    await refreshNotifications({ silent: true }).catch(() => undefined);

                    pushToast({
                      title: "Comment posted",
                      description: "The issue discussion has been updated.",
                      tone: "success",
                    });
                  }}
                />
              )}

              <div className="mt-6 space-y-3">
                {sortedComments.length > 0 ? (
                  sortedComments.map((comment) => (
                    <Card key={comment.id} className="rounded-[24px] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {comment.user.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {comment.user.email}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {comment.content}
                      </p>
                    </Card>
                  ))
                ) : (
                  <Card className="rounded-[24px] p-5">
                    <p className="text-sm text-slate-500">
                      No comments yet. Add the first note for the team.
                    </p>
                  </Card>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Assignment
                  </p>
                  <select
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
                    disabled={currentProjectRole === "VIEWER"}
                    onChange={async (event) => {
                      const previousDetail = detail;

                      setDetail((currentDetail) =>
                        currentDetail
                          ? {
                              ...currentDetail,
                              issue: {
                                ...currentDetail.issue,
                                assignee:
                                  currentDetail.teamMembers.find(
                                    (member) => member.id === event.target.value,
                                  ) ?? null,
                              },
                            }
                          : currentDetail,
                      );

                      try {
                        const result = await updateIssueRequest(
                          authorizedFetch,
                          issueId,
                          {
                            assigneeId: event.target.value || null,
                            version: previousDetail.issue.version,
                          },
                        );

                        setDetail((currentDetail) =>
                          currentDetail
                            ? {
                                ...currentDetail,
                                issue: result.issue,
                              }
                            : currentDetail,
                        );
                        await reloadIssue().catch(() => undefined);
                        await refreshNotifications({ silent: true }).catch(() => undefined);

                        pushToast({
                          title: "Assignment updated",
                          description: "The issue ownership has been saved.",
                          tone: "success",
                        });
                      } catch (assignError) {
                        setDetail(previousDetail);
                        await reloadIssue();
                        pushToast({
                          title: "Assignment failed",
                          description:
                            assignError instanceof Error
                              ? assignError.message
                              : "Unable to update the assignee.",
                          tone: "error",
                        });
                      }
                    }}
                    value={detail.issue.assignee?.id ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {assignableTeamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.projectRole})
                      </option>
                    ))}
                  </select>
                  {restrictAdminAssignments ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Admin users cannot be assigned by Admin or QA accounts.
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Status
                  </p>
                  <select
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
                    disabled={currentProjectRole === "VIEWER"}
                    onChange={async (event) => {
                      const nextStatus = event.target.value as IssueSummary["status"];
                      const previousDetail = detail;

                      setDetail((currentDetail) =>
                        currentDetail
                          ? {
                              ...currentDetail,
                              issue: {
                                ...currentDetail.issue,
                                status: nextStatus,
                              },
                            }
                          : currentDetail,
                      );

                      try {
                        const result = await updateIssueRequest(
                          authorizedFetch,
                          issueId,
                          {
                            status: nextStatus,
                            version: previousDetail.issue.version,
                          },
                        );

                        setDetail((currentDetail) =>
                          currentDetail
                            ? {
                                ...currentDetail,
                                issue: result.issue,
                              }
                            : currentDetail,
                        );
                        await reloadIssue().catch(() => undefined);
                        await refreshNotifications({ silent: true }).catch(() => undefined);

                        pushToast({
                          title: "Status updated",
                          description: "The board state is now current.",
                          tone: "success",
                        });
                      } catch (statusError) {
                        setDetail(previousDetail);
                        await reloadIssue();
                        pushToast({
                          title: "Status change failed",
                          description:
                            statusError instanceof Error
                              ? statusError.message
                              : "Unable to move the issue.",
                          tone: "error",
                        });
                      }
                    }}
                    value={detail.issue.status}
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="DONE">Done</option>
                    <option value="CLOSED">Closed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {currentProjectRole === "ADMIN" ? (
                  <Button
                    className="w-full"
                    leadingIcon={<Trash2 className="size-4" />}
                    variant="danger"
                    onClick={async () => {
                      try {
                        await deleteIssueRequest(authorizedFetch, issueId);
                        pushToast({
                          title: "Issue deleted",
                          description: "The issue has been removed from the board.",
                          tone: "success",
                        });
                        window.location.assign("/dashboard");
                      } catch (deleteError) {
                        pushToast({
                          title: "Delete failed",
                          description:
                            deleteError instanceof Error
                              ? deleteError.message
                              : "Unable to delete this issue.",
                          tone: "error",
                        });
                      }
                    }}
                  >
                    Delete issue
                  </Button>
                ) : null}
              </div>
            </Card>

            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Activity</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Every meaningful update to this issue is captured here.
                </p>
              </div>
              <ActivityTimeline currentUserId={user?.id} logs={detail.auditLogs} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
