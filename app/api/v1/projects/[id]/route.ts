import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { withAuthRoute } from "@/middleware/auth";
import { deleteProject } from "@/services/project-service";

interface ProjectRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  context: ProjectRouteContext,
) {
  return withAuthRoute(request, async () => {
    const { id } = await context.params;
    const result = await deleteProject(id);

    return apiSuccess(result, 200);
  });
}
