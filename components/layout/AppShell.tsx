"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bug,
  FolderKanban,
  FolderPlus,
  LayoutPanelTop,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ProjectDeleteModal } from "@/components/dashboard/ProjectDeleteModal";
import { NotificationMenu } from "@/components/layout/NotificationMenu";
import { ProjectModal } from "@/components/dashboard/ProjectModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProjects } from "@/components/providers/ProjectProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_PROJECT_NAME } from "@/lib/projects";
import type { ProjectSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AppShellProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const navigation = [
  {
    href: "/dashboard",
    label: "Board",
    icon: LayoutPanelTop,
  },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();
  const { pushToast } = useToast();
  const {
    closeCreateProjectModal,
    createProject,
    deleteProject,
    isLoading: isLoadingProjects,
    isCreateModalOpen,
    isReady: areProjectsReady,
    openCreateProjectModal,
    projects,
    selectProject,
    selectedProject,
    selectedProjectId,
  } = useProjects();
  const [projectPendingDelete, setProjectPendingDelete] =
    useState<ProjectSummary | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  useEffect(() => {
    if (isReady && !user) {
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, pathname, router, user]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500 shadow-sm">
          <span className="size-2 rounded-full bg-blue-500" />
          Restoring your workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="flex flex-col justify-between p-5">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.9)]">
                  <Bug className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Issue Platform
                  </p>
                  <h1 className="text-2xl font-semibold text-slate-950">
                    BugFlow
                  </h1>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                A focused workspace for triage, collaboration, and reliable
                delivery.
              </p>
            </div>

            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[24px] bg-slate-950 p-4 text-white shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Signed in
                  </p>
                  <p className="mt-2 text-base font-semibold">{user.name}</p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
                <ShieldCheck className="size-5 text-blue-300" />
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-blue-300">
                {user.role}
              </p>
            </Card>

            <Button
              className="w-full"
              variant="secondary"
              leadingIcon={<LogOut className="size-4" />}
              onClick={() => void logout()}
            >
              Log out
            </Button>
          </div>
        </Card>

        <div className="flex min-h-full flex-col gap-4">
          <Card className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Operational View
                </p>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-[240px] flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Project</span>
                  <div className="relative">
                    <FolderKanban className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <select
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={isLoadingProjects || !areProjectsReady || projects.length === 0}
                      onChange={(event) => selectProject(event.target.value)}
                      value={selectedProjectId ?? ""}
                    >
                      {projects.length === 0 ? (
                        <option value="">
                          {isLoadingProjects ? "Loading projects..." : "Create a project"}
                        </option>
                      ) : null}
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <Button
                  leadingIcon={<FolderPlus className="size-4" />}
                  onClick={openCreateProjectModal}
                  variant="secondary"
                >
                  New project
                </Button>

                <NotificationMenu />

                {selectedProject &&
                selectedProject.name !== DEFAULT_PROJECT_NAME ? (
                  <Button
                    leadingIcon={<Trash2 className="size-4" />}
                    onClick={() => setProjectPendingDelete(selectedProject)}
                    variant="danger"
                  >
                    Delete project
                  </Button>
                ) : null}

                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
              </div>
            </div>
          </Card>

          <div className="flex-1">{children}</div>
        </div>
      </div>

      <ProjectModal
        onClose={closeCreateProjectModal}
        onSubmit={async (input) => {
          try {
            const project = await createProject(input.name);

            pushToast({
              title: "Project created",
              description: `${project.name} is ready for issue tracking.`,
              tone: "success",
            });
            closeCreateProjectModal();
          } catch (error) {
            pushToast({
              title: "Project creation failed",
              description:
                error instanceof Error
                  ? error.message
                  : "Unable to create the project right now.",
              tone: "error",
            });
            throw error;
          }
        }}
        open={isCreateModalOpen}
      />

      <ProjectDeleteModal
        isSubmitting={isDeletingProject}
        onClose={() => {
          if (!isDeletingProject) {
            setProjectPendingDelete(null);
          }
        }}
        onSubmit={async () => {
          if (!projectPendingDelete) {
            return;
          }

          setIsDeletingProject(true);

          try {
            const result = await deleteProject(projectPendingDelete.id);

            pushToast({
              title: "Project deleted",
              description:
                result.movedIssueCount > 0
                  ? `${result.movedIssueCount} issue${result.movedIssueCount === 1 ? "" : "s"} moved to ${result.fallbackProject.name}.`
                  : `${projectPendingDelete.name} was archived safely.`,
              tone: "success",
            });
            setProjectPendingDelete(null);
          } catch (error) {
            pushToast({
              title: "Project deletion failed",
              description:
                error instanceof Error
                  ? error.message
                  : "Unable to delete the project right now.",
              tone: "error",
            });
            throw error;
          } finally {
            setIsDeletingProject(false);
          }
        }}
        open={Boolean(projectPendingDelete)}
        project={projectPendingDelete}
      />
    </div>
  );
}
