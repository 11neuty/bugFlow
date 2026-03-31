import { cookies } from "next/headers";

import { clearRefreshTokenCookie, setRefreshTokenCookie } from "@/lib/auth-cookies";
import { apiSuccess, routeHandler } from "@/lib/api-response";
import { REFRESH_TOKEN_COOKIE } from "@/lib/constants";
import { unauthorized } from "@/lib/errors";
import { refreshAuthToken } from "@/services/auth-service";

export async function POST() {
  return routeHandler(async () => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      throw unauthorized("No refresh token was provided.");
    }

    const result = await refreshAuthToken(refreshToken);
    const response = apiSuccess(
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      200,
    );

    clearRefreshTokenCookie(response);
    setRefreshTokenCookie(response, result.refreshToken);

    return response;
  });
}
