import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { issueRelationRouteParamsSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { deleteIssueRelation } from "@/services/issue-relations-service";

interface IssueRelationRouteContext {
  params: Promise<{
    id: string;
    relationId: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  context: IssueRelationRouteContext,
) {
  return withAuthRoute(request, async (user) => {
    const { id, relationId } = issueRelationRouteParamsSchema.parse(
      await context.params,
    );
    const result = await deleteIssueRelation(user, id, relationId);

    return apiSuccess(result, 200);
  });
}
