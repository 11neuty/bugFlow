import type { NextRequest } from "next/server";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export function getRequestId(request: NextRequest) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "local";
  }

  return request.headers.get("x-real-ip") ?? "local";
}

export function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? DEFAULT_PAGE);
  const limit = Number(searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);

  return {
    page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
    limit:
      Number.isFinite(limit) && limit > 0
        ? Math.min(limit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE,
  };
}
