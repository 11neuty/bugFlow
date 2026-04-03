import { Prisma } from "@prisma/client";

import { apiSuccess, routeHandler } from "@/lib/api-response";
import { getDatabaseEnvDiagnostics } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return routeHandler(async () => {
    console.log("GET /api/v1/health called", {
      dbEnv: getDatabaseEnvDiagnostics(),
    });

    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);

      return apiSuccess(
        {
          status: "OK",
          db: "connected",
        },
        200,
      );
    } catch (error) {
      console.error("Health check error", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return apiSuccess(
        {
          status: "DEGRADED",
          db: "disconnected",
        },
        503,
      );
    }
  });
}
