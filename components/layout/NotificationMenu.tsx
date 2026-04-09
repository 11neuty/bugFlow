"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  MessageSquareMore,
  UserRoundPlus,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useNotifications } from "@/components/providers/NotificationProvider";
import { useProjects } from "@/components/providers/ProjectProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getActivityDateLabel } from "@/lib/activity";
import type { NotificationRecord } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

function iconForNotification(type: NotificationRecord["type"]): LucideIcon {
  switch (type) {
    case "ISSUE_ASSIGNED":
      return UserRoundPlus;
    case "ISSUE_COMMENTED":
      return MessageSquareMore;
    case "ISSUE_STATUS_CHANGED":
      return Workflow;
    default:
      return Bell;
    }
}

export function NotificationMenu() {
  const router = useRouter();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // click outside handler
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }

      if (open) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationRecord[]>();

    notifications.forEach((n) => {
      const key = getActivityDateLabel(n.createdAt);
      const group = groups.get(key) ?? [];
      group.push(n);
      groups.set(key, group);
    });

    return Array.from(groups.entries()).map(([label, entries]) => ({
      label,
      entries,
    }));
  }, [notifications]);

  return (
    <div className="relative" ref={anchorRef}>
      {/* 🔔 BUTTON */}
      <button
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        onClick={() => {
          const nextOpen = !open;

          if (nextOpen) {
            setIsVisible(false);
            void refreshNotifications({ silent: true });
          }

          setOpen(nextOpen);
        }}
        type="button"
      >
        <Bell className="size-4" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 🔥 PORTAL DROPDOWN */}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className={`fixed right-6 top-20 z-[100] w-[380px] origin-top-right transition duration-150 ease-out ${
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "-translate-y-2 scale-95 opacity-0"
            }`}
          >
            <Card className="overflow-hidden rounded-[28px] p-0 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.42)] bg-white">
              
              {/* HEADER */}
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-slate-500">
                    Stay on top of updates
                  </p>
                </div>

                <Button
                  disabled={unreadCount === 0}
                  size="sm"
                  variant="ghost"
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
                >
                  <CheckCheck className="size-4 mr-1" />
                  Mark all
                </Button>
              </div>

              {/* LIST */}
              <div className="max-h-[460px] overflow-y-auto px-4 py-4">
                {notifications.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">
                    {isLoading ? "Loading notifications..." : "No notifications yet"}
                  </p>
                ) : (
                  groupedNotifications.map((group) => (
                    <div key={group.label} className="mb-4">
                      <p className="text-xs text-slate-400 mb-2">
                        {group.label}
                      </p>

                      {group.entries.map((n) => {
                        const Icon = iconForNotification(n.type);

                        return (
                          <button
                            key={n.id}
                            className="w-full text-left p-3 rounded-xl hover:bg-slate-50"
                            onClick={async () => {
                              try {
                                if (!n.isRead) {
                                  await markNotificationRead(n.id);
                                }

                                if (n.issue?.project.id) {
                                  selectProject(n.issue.project.id);
                                }

                                setOpen(false);

                                if (n.issue?.id) {
                                  router.push(`/issues/${n.issue.id}`);
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
                            <div className="flex gap-3">
                              <Icon className="size-4 mt-1" />

                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {n.message}
                                </p>

                                {n.issue ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {n.issue.issueKey} · {n.issue.project.name}
                                  </p>
                                ) : null}

                                <p className="mt-1 text-xs text-slate-400">
                                  {formatRelative(n.createdAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* FOOTER */}
              <div className="border-t px-5 py-3 text-right">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <span className="text-xs text-slate-500 hover:text-black">
                    Back to board
                  </span>
                </Link>
              </div>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
}
