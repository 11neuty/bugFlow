"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createIssueRequest,
  fetchIssues,
  fetchUsers,
  updateIssueRequest,
} from "@/api/issues";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { IssueFilterBar } from "@/components/dashboard/IssueFilterBar";
import { IssueModal } from "@/components/dashboard/IssueModal";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { IssueFilters, IssueSummary, UserSummary } from "@/lib/types";

const initialFilters: IssueFilters = {
  page: 1,
  limit: 12,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

export function DashboardView() {
  const router = useRouter();
  const { authorizedFetch, isReady, user } = useAuth();
  const { pushToast } = useToast();
  const [filters, setFilters] = useState<IssueFilters>(initialFilters);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });

  useEffect(() => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        page: 1,
        q: deferredSearch || undefined,
      }));
    });
  }, [deferredSearch]);

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    let cancelled = false;

    const loadBoard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [issueResult, userResult] = await Promise.all([
          fetchIssues(authorizedFetch, filters),
          fetchUsers(authorizedFetch),
        ]);

        if (cancelled) {
          return;
        }

        setIssues(issueResult.issues);
        setMembers(userResult.users);
        setMeta({
          total: issueResult.total,
          page: issueResult.page,
          limit: issueResult.limit,
          totalPages: issueResult.totalPages,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the board.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [authorizedFetch, filters, isReady, user]);

  const refreshBoard = async () => {
    setIsRefreshing(true);

    try {
      const result = await fetchIssues(authorizedFetch, filters);
      setIssues(result.issues);
      setMeta({
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (refreshError) {
      pushToast({
        title: "Refresh failed",
        description:
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to refresh the board.",
        tone: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AppShell
      actions={
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
          {meta.total} active issue{meta.total === 1 ? "" : "s"}
        </div>
      }
      subtitle="Track work across the board, capture fresh reports, and move issues through the workflow with optimistic updates."
      title="Dashboard"
    >
      <div className="space-y-4">
        <Card className="p-5">
          <IssueFilterBar
            filters={filters}
            isRefreshing={isRefreshing}
            onCreateIssue={() => setIsCreateOpen(true)}
            onFiltersChange={(nextFilters) => {
              startTransition(() => {
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  ...nextFilters,
                }));
              });
            }}
            onRefresh={() => void refreshBoard()}
            onSearchChange={setSearch}
            search={search}
          />
        </Card>

        <KanbanBoard
          error={error}
          issues={issues}
          loading={loading}
          onMoveIssue={async (issueId, status) => {
            const issue = issues.find((item) => item.id === issueId);

            if (!issue || issue.status === status) {
              return;
            }

            const previousIssues = issues;

            setIssues((currentIssues) =>
              currentIssues.map((item) =>
                item.id === issueId ? { ...item, status } : item,
              ),
            );

            try {
              const result = await updateIssueRequest(authorizedFetch, issueId, {
                status,
                version: issue.version,
              });

              setIssues((currentIssues) =>
                currentIssues.map((item) =>
                  item.id === issueId ? result.issue : item,
                ),
              );

              pushToast({
                title: "Issue moved",
                description: `Moved to ${status.replace("_", " ").toLowerCase()}.`,
                tone: "success",
              });
            } catch (moveError) {
              setIssues(previousIssues);
              await refreshBoard();
              pushToast({
                title: "Unable to move issue",
                description:
                  moveError instanceof Error
                    ? moveError.message
                    : "The issue changed before your update completed.",
                tone: "error",
              });
            }
          }}
          onOpenIssue={(issueId) => router.push(`/issues/${issueId}`)}
          onRetry={() => void refreshBoard()}
        />

        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-950">
              Page {meta.page} of {meta.totalPages}
            </p>
            <p className="text-sm text-slate-500">
              Showing up to {meta.limit} issues per page.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() =>
                startTransition(() => {
                  setFilters((current) => ({
                    ...current,
                    page: Math.max(1, (current.page ?? 1) - 1),
                  }));
                })
              }
              variant="secondary"
              disabled={meta.page <= 1}
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                startTransition(() => {
                  setFilters((current) => ({
                    ...current,
                    page: Math.min(meta.totalPages, (current.page ?? 1) + 1),
                  }));
                })
              }
              variant="secondary"
              disabled={meta.page >= meta.totalPages}
            >
              Next
            </Button>
          </div>
        </Card>
      </div>

      <IssueModal
        members={members}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (input) => {
          const result = await createIssueRequest(authorizedFetch, input);

          pushToast({
            title: "Issue created",
            description: `${result.issue.title} is ready for triage.`,
            tone: "success",
          });

          await refreshBoard();
        }}
        open={isCreateOpen}
      />
    </AppShell>
  );
}
