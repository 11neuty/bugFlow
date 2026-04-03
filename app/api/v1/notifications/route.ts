import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { withAuthRoute } from "@/middleware/auth";
import { listNotifications } from "@/services/notification-service";

export async function GET(request: NextRequest) {
  return withAuthRoute(request, async (user) => {
    const notifications = await listNotifications(prisma, user.id);

    return apiSuccess(notifications, 200);
  });
}
