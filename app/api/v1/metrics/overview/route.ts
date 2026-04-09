import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { metricsQuerySchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { getMetricsOverview } from "@/services/metrics-service";

export async function GET(request: NextRequest) {
  return withAuthRoute(request, async (user) => {
    const query = metricsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const result = await getMetricsOverview(user, query.projectId);

    return apiSuccess(result, 200);
  });
}
