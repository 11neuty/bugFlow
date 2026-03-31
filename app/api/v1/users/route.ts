import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { registerSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import { createUser, listUsers } from "@/services/users-service";

export async function GET(request: NextRequest) {
  return withAuthRoute(request, async () => {
    const result = await listUsers();

    return apiSuccess(result, 200);
  });
}

export async function POST(request: NextRequest) {
  return withAuthRoute(request, async (user) => {
    const body = await request.json();
    const input = registerSchema.parse(body);
    const result = await createUser(user, input);

    return apiSuccess(result, 201);
  });
}
