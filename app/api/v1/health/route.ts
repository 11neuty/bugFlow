import { Prisma } from "@prisma/client";

import { apiSuccess, routeHandler } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return routeHandler(async () => {
    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);

      return apiSuccess(
        {
          status: "UP",
          database: "CONNECTED",
          timestamp: new Date().toISOString(),
        },
        200,
      );
    } catch {
      return apiSuccess(
        {
          status: "DEGRADED",
          database: "DISCONNECTED",
          timestamp: new Date().toISOString(),
        },
        503,
      );
    }
  });
}
