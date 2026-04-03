"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleDot,
  MessageSquareMore,
  UserRoundPlus,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useNotifications } from "@/components/providers/NotificationProvider";
import { useProjects } from "@/components/providers/ProjectProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getActivityDateLabel } from "@/lib/activity";
import type { NotificationRecord } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

function iconForNotification(type: NotificationRecord["type"]): LucideIcon {
  switch (type) {
    case "ISSUE_ASSIGNED":
      return UserRoundPlus;
    case "ISSUE_COMMENTED":
      return MessageSquareMore;
    case "ISSUE_STATUS_CHANGED":
      return Workflow;
    default:
      return CircleDot;
  }
}

function toneForNotification(type: NotificationRecord["type"]) {
  switch (type) {
    case "ISSUE_ASSIGNED":
      return "blue";
    case "ISSUE_COMMENTED":
      return "amber";
    case "ISSUE_STATUS_CHANGED":
      return "green";
    default:
      return "neutral";
  }
}

export function NotificationMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { selectProject } = useProjects();
  const { pushToast } = useToast();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllNotificationsRead,
    markNotificationRead,
    refreshNotifications,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationRecord[]>();

    notifications.forEach((notification) => {
      const key = getActivityDateLabel(notification.createdAt);
      const group = groups.get(key) ?? [];
      group.push(notification);
      groups.set(key, group);
    });

    return Array.from(groups.entries()).map(([label, entries]) => ({
      label,
      entries,
    }));
  }, [notifications]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-label="Open notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        onClick={() => {
          setOpen((currentOpen) => !currentOpen);
          if (!open) {
            void refreshNotifications({ silent: true }).catch(() => undefined);
          }
        }}
        type="button"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--color-danger)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <Card className="absolute right-0 top-14 z-40 w-[380px] overflow-hidden rounded-[28px] p-0 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.42)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">Notifications</p>
              <p className="text-xs text-slate-500">
                Stay on top of assignments, comments, and workflow updates.
              </p>
            </div>
            <Button
              disabled={unreadCount === 0}
              leadingIcon={<CheckCheck className="size-4" />}
              onClick={async () => {
                try {
                  await markAllNotificationsRead();
                } catch (error) {
                  pushToast({
                    title: "Unable to mark notifications",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Try again in a moment.",
                    tone: "error",
                  });
                }
              }}
              size="sm"
              variant="ghost"
            >
              Mark all read
            </Button>
          </div>

          <div className="max-h-[460px] overflow-y-auto px-4 py-4">
            {isLoading && notifications.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">No notifications yet</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  We will keep this feed updated when issues are assigned or change.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedNotifications.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {group.label}
                    </p>

                    <div className="space-y-2">
                      {group.entries.map((notification) => {
                        const Icon = iconForNotification(notification.type);

                        return (
                          <button
                            key={notification.id}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition",
                              notification.isRead
                                ? "border-slate-200 bg-white hover:bg-slate-50"
                                : "border-[color:color-mix(in_srgb,var(--color-primary)_18%,white)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,white)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_9%,white)]",
                            )}
                            onClick={async () => {
                              try {
                                if (!notification.isRead) {
                                  await markNotificationRead(notification.id);
                                }

                                if (notification.issue?.project.id) {
                                  selectProject(notification.issue.project.id);
                                }

                                setOpen(false);

                                if (notification.issue?.id) {
                                  router.push(`/issues/${notification.issue.id}`);
                                }
                              } catch (error) {
                                pushToast({
                                  title: "Unable to open notification",
                                  description:
                                    error instanceof Error
                                      ? error.message
                                      : "Try again in a moment.",
                                  tone: "error",
                                });
                              }
                            }}
                            type="button"
                          >
                            <div
                              className={cn(
                                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl",
                                toneForNotification(notification.type) === "blue" &&
                                  "bg-blue-100 text-blue-700",
                                toneForNotification(notification.type) === "amber" &&
                                  "bg-amber-100 text-amber-700",
                                toneForNotification(notification.type) === "green" &&
                                  "bg-emerald-100 text-emerald-700",
                                toneForNotification(notification.type) === "neutral" &&
                                  "bg-slate-100 text-slate-700",
                              )}
                            >
                              <Icon className="size-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={toneForNotification(notification.type)}>
                                  {notification.type.replaceAll("_", " ")}
                                </Badge>
                                {!notification.isRead ? (
                                  <span className="inline-flex size-2 rounded-full bg-[color:var(--color-primary)]" />
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm font-medium leading-6 text-slate-950">
                                {notification.message}
                              </p>
                              {notification.issue ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="font-medium text-slate-700">
                                    {notification.issue.issueKey}
                                  </span>
                                  <span>{notification.issue.project.name}</span>
                                </div>
                              ) : null}
                              <p className="mt-2 text-xs text-slate-400">
                                {formatRelative(notification.createdAt)} {" - "}
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-right">
            <Link
              className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
              href="/dashboard"
              onClick={() => setOpen(false)}
            >
              Back to board
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

