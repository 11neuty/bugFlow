"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

import {
  createIssueRequest,
  fetchIssues,
  updateIssueRequest,
} from "@/api/issues";
import { createUserRequest, fetchUsers } from "@/api/users";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProjects } from "@/components/providers/ProjectProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { IssueFilterBar } from "@/components/dashboard/IssueFilterBar";
import { IssueModal } from "@/components/dashboard/IssueModal";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { UserModal } from "@/components/dashboard/UserModal";
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
  const {
    isReady: areProjectsReady,
    openCreateProjectModal,
    refreshProjects,
    selectedProject,
    selectedProjectId,
  } = useProjects();
  const { refreshNotifications } = useNotifications();
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
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [meta, setMeta] = useState({
    total: 0,
    activeTotal: 0,
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
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        page: 1,
      }));
    });
  }, [selectedProjectId]);

  useEffect(() => {
    if (!isReady || !user || !areProjectsReady) {
      return;
    }

    if (!selectedProjectId) {
      return;
    }

    let cancelled = false;

    const loadBoard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [issueResult, userResult] = await Promise.all([
          fetchIssues(authorizedFetch, {
            ...filters,
            projectId: selectedProjectId,
          }),
          fetchUsers(authorizedFetch),
        ]);

        if (cancelled) {
          return;
        }

        setIssues(issueResult.issues);
        setMembers(userResult.users);
        setMeta({
          total: issueResult.total,
          activeTotal: issueResult.activeTotal,
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
  }, [authorizedFetch, areProjectsReady, filters, isReady, selectedProjectId, user]);

  const refreshBoard = async () => {
    if (!selectedProjectId) {
      await refreshProjects();
      return;
    }

    setIsRefreshing(true);

    try {
      const [issueResult, userResult] = await Promise.all([
        fetchIssues(authorizedFetch, {
          ...filters,
          projectId: selectedProjectId,
        }),
        fetchUsers(authorizedFetch),
      ]);

      setIssues(issueResult.issues);
      setMembers(userResult.users);
      setMeta({
        total: issueResult.total,
        activeTotal: issueResult.activeTotal,
        page: issueResult.page,
        limit: issueResult.limit,
        totalPages: issueResult.totalPages,
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
        <>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
            {meta.activeTotal} active issue{meta.activeTotal === 1 ? "" : "s"}
          </div>
          {user?.role === "ADMIN" ? (
            <Button
              leadingIcon={<UserPlus className="size-4" />}
              onClick={() => setIsUserModalOpen(true)}
              variant="secondary"
            >
              New user
            </Button>
          ) : null}
        </>
      }
      subtitle="Track work across the board, capture fresh reports, and move issues through the workflow with optimistic updates."
      title="Dashboard"
    >
      {selectedProject ? (
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
                await refreshBoard();
                await refreshNotifications({ silent: true }).catch(() => undefined);

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
      ) : (
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-slate-950">
            Select a project to get started
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Issues, board states, and comments stay organized per workspace.
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={openCreateProjectModal}>Create Project</Button>
          </div>
        </Card>
      )}

      <IssueModal
        project={selectedProject}
        currentUserRole={user?.role ?? "DEVELOPER"}
        members={members}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (input) => {
          const result = await createIssueRequest(authorizedFetch, input);

          pushToast({
            title: "Issue created",
            description: `${result.issue.issueKey} ${result.issue.title} is ready for triage.`,
            tone: "success",
          });

          await refreshBoard();
          await refreshNotifications({ silent: true }).catch(() => undefined);
        }}
        open={isCreateOpen}
      />

      <UserModal
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={async (input) => {
          const result = await createUserRequest(authorizedFetch, input);

          pushToast({
            title: "User created",
            description: `${result.user.name} can sign in with the new account now.`,
            tone: "success",
          });

          await refreshBoard();
        }}
        open={isUserModalOpen}
      />
    </AppShell>
  );
}
