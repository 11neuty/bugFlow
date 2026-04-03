import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { withAuthRoute } from "@/middleware/auth";
import { markNotificationRead } from "@/services/notification-service";

interface NotificationRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  context: NotificationRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = await context.params;
    const result = await markNotificationRead(prisma, user.id, id);

    return apiSuccess(result, 200);
  });
}
