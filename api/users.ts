import type { AuthorizedFetcher } from "@/api/issues";
import type { Role, UserSummary } from "@/lib/types";

export function fetchUsers(authorizedFetch: AuthorizedFetcher) {
  return authorizedFetch<{ users: UserSummary[] }>("/api/v1/users");
}

export function createUserRequest(
  authorizedFetch: AuthorizedFetcher,
  input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  },
) {
  return authorizedFetch<{ user: UserSummary }>("/api/v1/users", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
