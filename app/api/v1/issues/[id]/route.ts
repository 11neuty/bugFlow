import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { updateIssueSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import {
  deleteIssue,
  getIssueDetail,
  updateIssue,
} from "@/services/issues-service";

interface IssueRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: IssueRouteContext) {
  return withAuthRoute(request, async (user) => {
    const { id } = await context.params;
    const result = await getIssueDetail(user, id);

    return apiSuccess(result, 200);
  });
}

export async function PATCH(request: NextRequest, context: IssueRouteContext) {
  return withAuthRoute(request, async (user) => {
    const { id } = await context.params;
    const body = await request.json();
    const input = updateIssueSchema.parse(body);
    const result = await updateIssue(user, id, input);

    return apiSuccess(result, 200);
  });
}

export async function DELETE(request: NextRequest, context: IssueRouteContext) {
  return withAuthRoute(request, async (user) => {
    const { id } = await context.params;
    const result = await deleteIssue(user, id);

    return apiSuccess(result, 200);
  });
}
