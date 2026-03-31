import type { NextRequest } from "next/server";

import { apiSuccess, routeHandler } from "@/lib/api-response";
import { setRefreshTokenCookie } from "@/lib/auth-cookies";
import { loginSchema } from "@/lib/schemas";
import { loginUser } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  return routeHandler(async () => {
    const body = await request.json();
    const input = loginSchema.parse(body);
    const result = await loginUser(input);
    const response = apiSuccess(
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      200,
    );

    setRefreshTokenCookie(response, result.refreshToken);

    return response;
  });
}
