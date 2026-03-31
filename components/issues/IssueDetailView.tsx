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
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { AuditLogList } from "@/components/issues/AuditLogList";
import { CommentComposer } from "@/components/issues/CommentComposer";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { IssueDetailPayload, IssueSummary } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function badgeToneForStatus(status: IssueSummary["status"]) {
  switch (status) {
    case "DONE":
      return "green";
    case "IN_PROGRESS":
      return "amber";
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
  const { pushToast } = useToast();
  const [detail, setDetail] = useState<IssueDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [authorizedFetch, isReady, issueId, user]);

  const reloadIssue = async () => {
    const result = await fetchIssueDetail(authorizedFetch, issueId);
    setDetail(result);
  };

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
                  <Badge tone={badgeToneForStatus(detail.issue.status)}>
                    {detail.issue.status}
                  </Badge>
                  <Badge tone={badgeToneForPriority(detail.issue.priority)}>
                    {detail.issue.priority}
                  </Badge>
                  <Badge tone="blue">{detail.issue.severity}</Badge>
                </div>
                <div>
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
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-950">Comments</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep the handoff crisp so the next person can act quickly.
                </p>
              </div>

              <CommentComposer
                onSubmit={async (content) => {
                  const result = await createCommentRequest(
                    authorizedFetch,
                    issueId,
                    content,
                  );

                  setDetail((currentDetail) =>
                    currentDetail
                      ? {
                          ...currentDetail,
                          comments: [...currentDetail.comments, result.comment],
                        }
                      : currentDetail,
                  );

                  pushToast({
                    title: "Comment posted",
                    description: "The issue discussion has been updated.",
                    tone: "success",
                  });
                }}
              />

              <div className="mt-6 space-y-3">
                {detail.comments.length > 0 ? (
                  detail.comments.map((comment) => (
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
                    {detail.teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Status
                  </p>
                  <select
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)]"
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
                  </select>
                </div>

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
              </div>
            </Card>

            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Audit log</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Every important workflow change is captured here.
                </p>
              </div>
              <AuditLogList logs={detail.auditLogs} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
