import type { NextRequest } from "next/server";

import { apiSuccess, routeHandler } from "@/lib/api-response";
import { registerSchema } from "@/lib/schemas";
import { registerUser } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  return routeHandler(async () => {
    const body = await request.json();
    const input = registerSchema.parse(body);
    const result = await registerUser(input);

    return apiSuccess(result, 201);
  });
}
