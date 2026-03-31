"use client";

import { ArrowRight, Flag, TriangleAlert, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { IssueSummary } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

function priorityTone(priority: IssueSummary["priority"]) {
  switch (priority) {
    case "HIGH":
      return "red";
    case "MEDIUM":
      return "amber";
    default:
      return "neutral";
  }
}

function severityTone(severity: IssueSummary["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return "red";
    case "MEDIUM":
      return "amber";
    default:
      return "blue";
  }
}

interface IssueCardProps {
  issue: IssueSummary;
  onOpen: (issueId: string) => void;
}

export function IssueCard({ issue, onOpen }: IssueCardProps) {
  return (
    <Card
      className="cursor-pointer rounded-[24px] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_-35px_rgba(15,23,42,0.55)]"
      draggable
      onClick={() => onOpen(issue.id)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", issue.id);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-950">{issue.title}</p>
          <p className="line-clamp-2 text-sm leading-6 text-slate-500">
            {issue.description}
          </p>
        </div>
        <ArrowRight className="mt-0.5 size-4 text-slate-300" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={priorityTone(issue.priority)}>
          <Flag className="mr-1 inline size-3" />
          {issue.priority}
        </Badge>
        <Badge tone={severityTone(issue.severity)}>
          <TriangleAlert className="mr-1 inline size-3" />
          {issue.severity}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <div className="inline-flex items-center gap-1.5">
          <UserRound className="size-3.5" />
          <span>{issue.assignee?.name ?? "Unassigned"}</span>
        </div>
        <span>{formatRelative(issue.updatedAt)}</span>
      </div>
    </Card>
  );
}
