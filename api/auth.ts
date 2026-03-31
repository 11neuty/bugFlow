import { parseApiResponse } from "@/api/client";
import type { AuthPayload } from "@/lib/types";

export async function loginRequest(input: {
  email: string;
  password: string;
}) {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<AuthPayload>(response);
}

export async function refreshRequest() {
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  return parseApiResponse<AuthPayload>(response);
}

export async function logoutRequest() {
  const response = await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  return parseApiResponse<{ success: true }>(response);
}
