import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { withAuthRoute } from "@/middleware/auth";
import { listUsers } from "@/services/users-service";

export async function GET(request: NextRequest) {
  return withAuthRoute(request, async () => {
    const result = await listUsers();

    return apiSuccess(result, 200);
  });
}
