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
import { createPortal } from "react-dom";

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

  // click outside handler
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
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
    <div className="relative" ref={menuRef}>
      {/* 🔔 BUTTON */}
      <button
        aria-label="Open notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            void refreshNotifications({ silent: true });
          }
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
            ref={menuRef}
            className="fixed top-20 right-6 z-[9999] w-[380px]"
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
                  onClick={markAllNotificationsRead}
                >
                  <CheckCheck className="size-4 mr-1" />
                  Mark all
                </Button>
              </div>

              {/* LIST */}
              <div className="max-h-[460px] overflow-y-auto px-4 py-4">
                {notifications.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">
                    No notifications
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
                            }}
                          >
                            <div className="flex gap-3">
                              <Icon className="size-4 mt-1" />

                              <div>
                                <p className="text-sm font-medium">
                                  {n.message}
                                </p>

                                <p className="text-xs text-slate-400">
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