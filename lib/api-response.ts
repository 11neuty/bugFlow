import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";
import type { ApiResponse } from "@/lib/types";

type Init = number | ResponseInit;

function resolveInit(init?: Init) {
  if (typeof init === "number") {
    return { status: init };
  }

  return init;
}

export function apiSuccess<T>(data: T, init?: Init) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      error: null,
    },
    resolveInit(init),
  );
}

export function apiError(message: string, init?: Init) {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      data: null,
      error: message,
    },
    resolveInit(init),
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Prisma initialization error", {
      message: error.message,
      stack: error.stack,
    });
    return apiError("Database unavailable", 503);
  }

  if (error instanceof AppError) {
    return apiError(error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    return apiError(
      error.issues.map((issue) => issue.message).join(", "),
      400,
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Prisma known request error", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });

    if (error.code === "P2002") {
      return apiError("A record with those values already exists.", 400);
    }

    if (error.code === "P2022") {
      return apiError("Database schema is out of sync.", 500);
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error("Prisma unknown request error", {
      message: error.message,
      stack: error.stack,
    });
    return apiError("Database query failed", 500);
  }

  console.error(error);
  return apiError("Internal server error", 500);
}

export async function routeHandler<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>,
) {
  try {
    return await handler();
  } catch (error) {
    return handleRouteError(error);
  }
}
