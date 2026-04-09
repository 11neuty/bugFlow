import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiSuccess } from "@/lib/api-response";
import { projectMemberUpdateSchema, projectIdParamSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import {
  removeProjectMember,
  updateProjectMemberRole,
} from "@/services/project-members-service";

interface ProjectMemberRouteContext {
  params: Promise<{
    id: string;
    memberId: string;
  }>;
}

const projectMemberRouteParamsSchema = projectIdParamSchema.extend({
  memberId: z.string().trim().min(1, "Invalid member ID."),
});

export async function PATCH(
  request: NextRequest,
  context: ProjectMemberRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id, memberId } = projectMemberRouteParamsSchema.parse(await context.params);
    const body = await request.json();
    const input = projectMemberUpdateSchema.parse(body);
    const result = await updateProjectMemberRole(user, id, memberId, input);

    return apiSuccess({ member: result }, 200);
  });
}

export async function DELETE(
  request: NextRequest,
  context: ProjectMemberRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id, memberId } = projectMemberRouteParamsSchema.parse(await context.params);
    const result = await removeProjectMember(user, id, memberId);

    return apiSuccess(result, 200);
  });
}
