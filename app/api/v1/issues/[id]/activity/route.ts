import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { withAuthRoute } from "@/middleware/auth";
import { listIssueActivity } from "@/services/audit-log-service";

interface IssueActivityRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: IssueActivityRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = await context.params;
    const result = await listIssueActivity(prisma, user, id);

    return apiSuccess(result, 200);
  });
}
