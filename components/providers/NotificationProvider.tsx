"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  fetchNotifications,
  fetchNotificationUnreadCount,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from "@/api/notifications";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { NotificationRecord } from "@/lib/types";

interface NotificationContextValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  isReady: boolean;
  isLoading: boolean;
  refreshNotifications: (options?: { silent?: boolean }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { authorizedFetch, isReady: isAuthReady, user } = useAuth();
  const { pushToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshNotifications = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        setIsReady(true);
        return;
      }

      setIsLoading(true);

      try {
        const [notificationList, unreadPayload] = await Promise.all([
          fetchNotifications(authorizedFetch),
          fetchNotificationUnreadCount(authorizedFetch),
        ]);

        setNotifications(notificationList);
        setUnreadCount(unreadPayload.unreadCount);
        setIsReady(true);
      } catch (error) {
        if (!options.silent) {
          pushToast({
            title: "Notifications unavailable",
            description:
              error instanceof Error
                ? error.message
                : "Unable to refresh notifications right now.",
            tone: "error",
          });
        }
        setIsReady(true);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [authorizedFetch, pushToast, user],
  );

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    void refreshNotifications({ silent: true }).catch(() => undefined);
  }, [isAuthReady, refreshNotifications, user]);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      await markNotificationReadRequest(authorizedFetch, notificationId);

      const wasUnread = notifications.some(
        (notification) =>
          notification.id === notificationId && !notification.isRead,
      );

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => {
          if (notification.id !== notificationId) {
            return notification;
          }

          return { ...notification, isRead: true };
        }),
      );
      if (wasUnread) {
        setUnreadCount((currentUnreadCount) => Math.max(0, currentUnreadCount - 1));
      }
    },
    [authorizedFetch, notifications],
  );

  const markAllNotificationsRead = useCallback(async () => {
    await markAllNotificationsReadRequest(authorizedFetch);

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );
    setUnreadCount(0);
  }, [authorizedFetch]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isReady,
        isLoading,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider.");
  }

  return context;
}
