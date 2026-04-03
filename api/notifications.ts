import type { AuthorizedFetcher } from "@/api/issues";
import type {
  NotificationRecord,
  NotificationUnreadCountPayload,
} from "@/lib/types";

export function fetchNotifications(authorizedFetch: AuthorizedFetcher) {
  return authorizedFetch<NotificationRecord[]>("/api/v1/notifications");
}

export function fetchNotificationUnreadCount(
  authorizedFetch: AuthorizedFetcher,
) {
  return authorizedFetch<NotificationUnreadCountPayload>(
    "/api/v1/notifications/unread-count",
  );
}

export function markNotificationReadRequest(
  authorizedFetch: AuthorizedFetcher,
  notificationId: string,
) {
  return authorizedFetch<{ read: boolean }>(
    `/api/v1/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  );
}

export function markAllNotificationsReadRequest(
  authorizedFetch: AuthorizedFetcher,
) {
  return authorizedFetch<{ updatedCount: number }>(
    "/api/v1/notifications/read-all",
    {
      method: "PATCH",
    },
  );
}
