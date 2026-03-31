import type { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_TTL_SECONDS } from "@/lib/constants";
import { getEnv } from "@/lib/env";
import type { ApiResponse } from "@/lib/types";

type ApiNextResponse<T> = NextResponse<ApiResponse<T>>;

export function setRefreshTokenCookie<T>(
  response: ApiNextResponse<T>,
  token: string,
) {
  const env = getEnv();

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearRefreshTokenCookie<T>(response: ApiNextResponse<T>) {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
