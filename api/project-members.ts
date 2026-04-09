import type { AuthorizedFetcher } from "@/api/issues";
import type { ProjectMemberRecord, ProjectMembersPayload, ProjectRole } from "@/lib/types";

export function fetchProjectMembers(
  authorizedFetch: AuthorizedFetcher,
  projectId: string,
) {
  return authorizedFetch<ProjectMembersPayload>(`/api/v1/projects/${projectId}/members`);
}

export function addProjectMemberRequest(
  authorizedFetch: AuthorizedFetcher,
  projectId: string,
  input: {
    userId: string;
    role: ProjectRole;
  },
) {
  return authorizedFetch<{ member: ProjectMemberRecord }>(
    `/api/v1/projects/${projectId}/members`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export function updateProjectMemberRoleRequest(
  authorizedFetch: AuthorizedFetcher,
  projectId: string,
  memberId: string,
  input: {
    role: ProjectRole;
  },
) {
  return authorizedFetch<{ member: ProjectMemberRecord }>(
    `/api/v1/projects/${projectId}/members/${memberId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export function removeProjectMemberRequest(
  authorizedFetch: AuthorizedFetcher,
  projectId: string,
  memberId: string,
) {
  return authorizedFetch<{ deleted: boolean }>(
    `/api/v1/projects/${projectId}/members/${memberId}`,
    {
      method: "DELETE",
    },
  );
}
