import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { withAuthRoute } from "@/middleware/auth";
import { markAllNotificationsRead } from "@/services/notification-service";

export async function PATCH(request: NextRequest) {
  return withAuthRoute(request, async (user) => {
    const result = await markAllNotificationsRead(prisma, user.id);

    return apiSuccess(result, 200);
  });
}
