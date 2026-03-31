import { cookies } from "next/headers";

import { clearRefreshTokenCookie } from "@/lib/auth-cookies";
import { apiSuccess, routeHandler } from "@/lib/api-response";
import { REFRESH_TOKEN_COOKIE } from "@/lib/constants";
import { logoutUser } from "@/services/auth-service";

export async function POST() {
  return routeHandler(async () => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    await logoutUser(refreshToken);

    const response = apiSuccess(
      {
        success: true,
      },
      200,
    );

    clearRefreshTokenCookie(response);

    return response;
  });
}
