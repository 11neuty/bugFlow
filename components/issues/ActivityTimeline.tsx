"use client";

import {
  ArrowUpRight,
  Flag,
  MessageSquareText,
  PlusCircle,
  Trash2,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  describeActivityAction,
  formatActivity,
  getActivityDateLabel,
} from "@/lib/activity";
import type { AuditLogRecord } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

function iconForAction(action: AuditLogRecord["action"]): LucideIcon {
  switch (action) {
    case "ISSUE_CREATED":
      return PlusCircle;
    case "STATUS_CHANGED":
      return Workflow;
    case "ASSIGNED":
    case "ASSIGNMENT_CHANGED":
      return UserRound;
    case "PRIORITY_CHANGED":
      return Flag;
    case "COMMENT_ADDED":
      return MessageSquareText;
    case "ISSUE_DELETED":
      return Trash2;
    default:
      return ArrowUpRight;
  }
}

function toneForAction(action: AuditLogRecord["action"]) {
  switch (action) {
    case "ISSUE_CREATED":
      return "blue";
    case "STATUS_CHANGED":
      return "amber";
    case "ASSIGNED":
    case "ASSIGNMENT_CHANGED":
      return "green";
    case "PRIORITY_CHANGED":
      return "red";
    case "COMMENT_ADDED":
      return "neutral";
    case "ISSUE_DELETED":
      return "red";
    default:
      return "neutral";
  }
}

function groupLogsByDate(logs: AuditLogRecord[]) {
  const groups = new Map<string, AuditLogRecord[]>();

  logs.forEach((log) => {
    const key = getActivityDateLabel(log.createdAt);
    const group = groups.get(key) ?? [];
    group.push(log);
    groups.set(key, group);
  });

  return Array.from(groups.entries()).map(([label, entries]) => ({
    label,
    entries,
  }));
}

export function ActivityTimeline({
  currentUserId,
  logs,
}: {
  currentUserId?: string;
  logs: AuditLogRecord[];
}) {
  if (logs.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-500">No activity yet.</p>
      </Card>
    );
  }

  const groups = groupLogsByDate(logs);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {group.label}
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3">
            {group.entries.map((log, index) => {
              const Icon = iconForAction(log.action);
              const isCurrentUser = currentUserId === log.user.id;

              return (
                <div key={log.id} className="relative pl-16">
                  {index !== group.entries.length - 1 ? (
                    <div className="absolute left-[1.15rem] top-10 h-[calc(100%+0.75rem)] w-px bg-slate-200" />
                  ) : null}

                  <div
                    className={cn(
                      "absolute left-0 top-2 flex size-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm",
                      isCurrentUser && "border-[color:var(--color-primary)] text-[color:var(--color-primary)]",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>

                  <Card
                    className={cn(
                      "rounded-[24px] p-4",
                      isCurrentUser && "border-[color:color-mix(in_srgb,var(--color-primary)_30%,white)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,white)]",
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={toneForAction(log.action)}>
                            {describeActivityAction(log.action)}
                          </Badge>
                          {isCurrentUser ? (
                            <Badge tone="blue" className="tracking-[0.08em]">
                              You
                            </Badge>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-sm font-semibold leading-6 text-slate-950">
                            {formatActivity(log, { currentUserId })}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {log.user.email}
                          </p>
                        </div>

                        {log.action === "COMMENT_ADDED" &&
                        typeof log.metadata?.preview === "string" ? (
                          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            {log.metadata.preview}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-slate-500">
                          {formatRelative(log.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
