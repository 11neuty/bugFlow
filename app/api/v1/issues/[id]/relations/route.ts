import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import {
  createIssueRelationSchema,
  issueCommentRouteParamsSchema,
} from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { createIssueRelation } from "@/services/issue-relations-service";

interface IssueRelationsRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: IssueRelationsRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id } = issueCommentRouteParamsSchema.parse(await context.params);
    const body = await request.json();
    const input = createIssueRelationSchema.parse(body);
    const result = await createIssueRelation(user, id, input);

    return apiSuccess(result, 201);
  });
}
