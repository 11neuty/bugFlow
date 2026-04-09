import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { createCommentSchema, issueCommentRouteParamsSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { createComment, listComments } from "@/services/comments-service";

interface IssueCommentRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: IssueCommentRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = issueCommentRouteParamsSchema.parse(await context.params);
    const result = await listComments(user, id);

    return apiSuccess(result, 200);
  });
}

export async function POST(
  request: NextRequest,
  context: IssueCommentRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = issueCommentRouteParamsSchema.parse(await context.params);
    const body = await request.json();
    const input = createCommentSchema.parse(body);
    const result = await createComment(user, id, input);

    return apiSuccess(result, 201);
  });
}
