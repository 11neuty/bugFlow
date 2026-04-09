import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { projectIdParamSchema, projectMemberCreateSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import {
  addProjectMember,
  listProjectMembers,
} from "@/services/project-members-service";

interface ProjectMembersRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: ProjectMembersRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = projectIdParamSchema.parse(await context.params);
    const result = await listProjectMembers(user, id);

    return apiSuccess(result, 200);
  });
}

export async function POST(
  request: NextRequest,
  context: ProjectMembersRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = projectIdParamSchema.parse(await context.params);
    const body = await request.json();
    const input = projectMemberCreateSchema.parse(body);
    const result = await addProjectMember(user, id, input);

    return apiSuccess({ member: result }, 201);
  });
}
