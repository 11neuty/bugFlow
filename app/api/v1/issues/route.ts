import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { apiSuccess } from "@/lib/api-response";
import { getDatabaseEnvDiagnostics } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createIssueSchema, issueQuerySchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { createIssue, listIssues } from "@/services/issues-service";

export async function GET(request: NextRequest) {
  console.log("GET /api/v1/issues called", {
    search: request.nextUrl.search,
    requestId: request.headers.get("x-request-id"),
    dbEnv: getDatabaseEnvDiagnostics(),
  });

  return withAuthRoute(request, async (user) => {
    try {
      const query = issueQuerySchema.parse(
        Object.fromEntries(request.nextUrl.searchParams.entries()),
      );

      console.log("Issues API: executing query", {
        userId: user.id,
        role: user.role,
        query,
      });

      await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      const result = await listIssues(user, query);
      console.log("Issues API: response data", {
        issueCount: result.issues.length,
        total: result.total,
        activeTotal: result.activeTotal,
        page: result.page,
        limit: result.limit,
      });

      return apiSuccess(result, 200);
    } catch (error) {
      console.error("Issues API ERROR:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
