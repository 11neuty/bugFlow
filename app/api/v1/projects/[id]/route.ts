import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { projectIdParamSchema } from "@/lib/schemas";
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
  return withAuthRoute(request, async (user) => {
    const params = projectIdParamSchema.parse(await context.params);
    const { id } = params;
    const result = await deleteProject(user, id);

    return apiSuccess(result, 200);
  });
}
