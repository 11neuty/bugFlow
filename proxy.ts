import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { RATE_LIMITS, REFRESH_TOKEN_COOKIE } from "@/lib/constants";
import { getClientIp, getRequestId } from "@/lib/request";
import { checkRateLimit } from "@/middleware/rate-limit";

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = getRequestId(request);
  requestHeaders.set("x-request-id", requestId);

  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (pathname.startsWith("/api/")) {
    const limitConfig =
      pathname === "/api/v1/auth/login" ? RATE_LIMITS.login : RATE_LIMITS.api;
    const rateLimitKey = `${getClientIp(request)}:${pathname}`;
    const result = checkRateLimit(
      rateLimitKey,
      limitConfig.limit,
      limitConfig.windowMs,
    );

    if (!result.allowed) {
      const rateLimited = NextResponse.json(
        {
          success: false,
          data: null,
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
        },
      );

      rateLimited.headers.set("x-request-id", requestId);
      rateLimited.headers.set("retry-after", String(result.retryAfter));
      applySecurityHeaders(rateLimited);

      return rateLimited;
    }

    response.headers.set("x-request-id", requestId);
    response.headers.set("x-ratelimit-remaining", String(result.remaining));
  }

  if (
    (pathname === "/dashboard" || pathname.startsWith("/issues/")) &&
    !request.cookies.get(REFRESH_TOKEN_COOKIE)
  ) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname);

    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && request.cookies.get(REFRESH_TOKEN_COOKIE)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  applySecurityHeaders(response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
