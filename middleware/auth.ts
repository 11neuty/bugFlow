import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-response";
import { unauthorized } from "@/lib/errors";
import { verifyAccessToken } from "@/lib/jwt";
import { getBearerToken } from "@/lib/request";
import type { ApiResponse, AuthUser } from "@/lib/types";

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const token = getBearerToken(request);

  if (!token) {
    throw unauthorized();
  }

  const payload = await verifyAccessToken(token);

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

export async function withAuthRoute<T>(
  request: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse<ApiResponse<T>>>,
) {
  try {
    const user = await requireAuth(request);
    return await handler(user);
  } catch (error) {
    return handleRouteError(error);
  }
}
