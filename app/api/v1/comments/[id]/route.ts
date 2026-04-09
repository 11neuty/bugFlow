import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { commentRouteParamsSchema, updateCommentSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { updateComment } from "@/services/comments-service";

interface CommentRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  context: CommentRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = commentRouteParamsSchema.parse(await context.params);
    const body = await request.json();
    const input = updateCommentSchema.parse(body);
    const result = await updateComment(user, id, input);

    return apiSuccess(result, 200);
  });
}
