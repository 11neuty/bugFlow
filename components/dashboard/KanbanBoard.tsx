"use client";

import { AlertCircle, ArrowRight, FolderOpen } from "lucide-react";

import { IssueCard } from "@/components/dashboard/IssueCard";
import { Card } from "@/components/ui/Card";
import type { IssueStatus, IssueSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const columns: Array<{
  status: IssueStatus;
  label: string;
  accent: string;
}> = [
  {
    status: "TODO",
    label: "Todo",
    accent: "bg-slate-900",
  },
  {
    status: "IN_PROGRESS",
    label: "In progress",
    accent: "bg-amber-500",
  },
  {
    status: "DONE",
    label: "Done",
    accent: "bg-emerald-500",
  },
  {
    status: "CLOSED",
    label: "Closed",
    accent: "bg-sky-500",
  },
  {
    status: "REJECTED",
    label: "Rejected",
    accent: "bg-rose-500",
  },
];

interface KanbanBoardProps {
  issues: IssueSummary[];
  loading: boolean;
  error: string | null;
  onOpenIssue: (issueId: string) => void;
  onMoveIssue: (issueId: string, status: IssueStatus) => void;
  onRetry: () => void;
}

export function KanbanBoard({
  issues,
  loading,
  error,
  onOpenIssue,
  onMoveIssue,
  onRetry,
}: KanbanBoardProps) {
  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-5">
        {columns.map((column) => (
          <Card key={column.status} className="p-4">
            <div className="space-y-4">
              <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`${column.status}-${index}`}
                    className="h-36 animate-pulse rounded-[24px] bg-slate-100"
                  />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="size-8 text-red-500" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-950">
            The board could not load
          </h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white"
          onClick={onRetry}
          type="button"
        >
          Retry
          <ArrowRight className="size-4" />
        </button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {columns.map((column) => {
        const columnIssues = issues.filter((issue) => issue.status === column.status);

        return (
          <Card
            key={column.status}
            className="flex min-h-[620px] flex-col gap-4 p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const issueId = event.dataTransfer.getData("text/plain");

              if (issueId) {
                onMoveIssue(issueId, column.status);
              }
            }}
          >
            <div className="flex items-center gap-3">
              <span className={cn("size-2.5 rounded-full", column.accent)} />
              <div>
                <p className="text-lg font-semibold text-slate-950">
                  {column.label}
                </p>
                <p className="text-sm text-slate-500">
                  {columnIssues.length} issue{columnIssues.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              {columnIssues.length > 0 ? (
                columnIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onOpen={onOpenIssue}
                  />
                ))
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                  <FolderOpen className="size-7 text-slate-300" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                      Nothing here yet
                    </p>
                    <p className="text-sm text-slate-400">
                      Drop a card into this lane or create a new issue.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
