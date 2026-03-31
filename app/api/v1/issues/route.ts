import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { createIssueSchema, issueQuerySchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { createIssue, listIssues } from "@/services/issues-service";

export async function GET(request: NextRequest) {
  return withAuthRoute(request, async () => {
    const query = issueQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const result = await listIssues(query);

    return apiSuccess(result, 200);
  });
}

export async function POST(request: NextRequest) {
  return withAuthRoute(request, async (user) => {
    const body = await request.json();
    const input = createIssueSchema.parse(body);
    const result = await createIssue(user, input);

    return apiSuccess(result, 201);
  });
}
