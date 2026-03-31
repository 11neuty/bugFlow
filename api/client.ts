import type { ApiResponse } from "@/lib/types";

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Something went wrong.");
  }

  return payload.data as T;
}
