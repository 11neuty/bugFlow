import type { AuthorizedFetcher } from "@/api/issues";
import type { ProjectDeletePayload, ProjectSummary } from "@/lib/types";

export function fetchProjects(authorizedFetch: AuthorizedFetcher) {
  return authorizedFetch<ProjectSummary[]>("/api/v1/projects");
}

export function createProjectRequest(
  authorizedFetch: AuthorizedFetcher,
  input: {
    name: string;
  },
) {
  return authorizedFetch<ProjectSummary>("/api/v1/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function deleteProjectRequest(
  authorizedFetch: AuthorizedFetcher,
  projectId: string,
) {
  return authorizedFetch<ProjectDeletePayload>(`/api/v1/projects/${projectId}`, {
    method: "DELETE",
  });
}
