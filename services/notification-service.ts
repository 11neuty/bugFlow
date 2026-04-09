import {
  Prisma,
  type NotificationType,
  type PrismaClient,
} from "@prisma/client";

import { NOTIFICATION_LIMIT } from "@/lib/constants";
import { notFound } from "@/lib/errors";
import { canReceiveNotification } from "@/lib/permissions";
import type { NotificationRecord } from "@/lib/types";
import { notificationWithIssueInclude, serializeNotification } from "@/services/serializers";

type NotificationClient = Prisma.TransactionClient | PrismaClient;

interface CreateNotificationInput {
  userId: string;
  issueId?: string | null;
  type: NotificationType;
  message: string;
  dedupeKey?: string;
}

export async function createNotification(
  client: NotificationClient,
  input: CreateNotificationInput,
) {
  if (input.issueId) {
    const issue = await client.issue.findUnique({
      where: {
        id: input.issueId,
      },
      select: {
        projectId: true,
      },
    });

    if (!issue) {
      return null;
    }

    const membership = await client.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: issue.projectId,
          userId: input.userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership || !canReceiveNotification(membership.role)) {
      return null;
    }
  }

  try {
    return await client.notification.create({
      data: {
        userId: input.userId,
        issueId: input.issueId ?? null,
        type: input.type,
        message: input.message,
        dedupeKey: input.dedupeKey,
      },
    });
  } catch (error) {
    if (
      input.dedupeKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }

    throw error;
  }
}

export async function listNotifications(
  prisma: PrismaClient,
  userId: string,
): Promise<NotificationRecord[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    include: notificationWithIssueInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: NOTIFICATION_LIMIT,
  });

  return notifications.map(serializeNotification);
}

export async function getUnreadNotificationCount(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function markNotificationRead(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const result = await prisma.notification.updateMany({
    where: {
      id,
      userId,
    },
    data: {
      isRead: true,
    },
  });

  if (result.count === 0) {
    throw notFound("Notification not found.");
  }

  return {
    read: true,
  };
}

export async function markAllNotificationsRead(
  prisma: PrismaClient,
  userId: string,
) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return {
    updatedCount: result.count,
  };
}
