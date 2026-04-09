import type { Prisma, PrismaClient, ProjectRole as PrismaProjectRole } from "@prisma/client";

import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
  AuthUser,
  ProjectMemberRecord,
  ProjectMembersPayload,
  ProjectRole,
  ProjectSummary,
  Role,
} from "@/lib/types";
import {
  projectMemberWithUserInclude,
  projectSummarySelect,
  serializeProject,
  serializeProjectMember,
  serializeUser,
  userSummarySelect,
} from "@/services/serializers";

type ProjectMemberClient = Prisma.TransactionClient | PrismaClient;

const projectMembershipSelect = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: projectSummarySelect,
  },
} satisfies Prisma.ProjectMemberSelect;

type SerializedProjectMembership = Prisma.ProjectMemberGetPayload<{
  select: typeof projectMembershipSelect;
}>;

export function mapGlobalRoleToProjectRole(role: Role): ProjectRole {
  switch (role) {
    case "ADMIN":
      return "ADMIN";
    case "QA":
      return "QA";
    default:
      return "DEVELOPER";
  }
}

function serializeMembershipProject(
  membership: SerializedProjectMembership,
): ProjectSummary {
  return serializeProject(membership.project, {
    currentUserRole: membership.role,
  });
}

async function getActiveProjectOrThrow(
  client: ProjectMemberClient,
  projectId: string,
) {
  const project = await client.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
    },
    select: projectSummarySelect,
  });

  if (!project) {
    throw notFound("Project not found.");
  }

  return project;
}

export async function getProjectMembership(
  client: ProjectMemberClient,
  userId: string,
  projectId: string,
) {
  return client.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: projectMembershipSelect,
  });
}

export async function requireProjectMembership(
  client: ProjectMemberClient,
  userId: string,
  projectId: string,
) {
  await getActiveProjectOrThrow(client, projectId);

  const membership = await getProjectMembership(client, userId, projectId);

  if (!membership) {
    throw forbidden("You do not have access to this project.");
  }

  return membership;
}

export async function requireProjectAdmin(
  client: ProjectMemberClient,
  userId: string,
  projectId: string,
) {
  const membership = await requireProjectMembership(client, userId, projectId);

  if (membership.role !== "ADMIN") {
    throw forbidden("Only project admins can perform this action.");
  }

  return membership;
}

export async function ensureProjectMembership(
  client: ProjectMemberClient,
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  const existingMembership = await client.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    include: projectMemberWithUserInclude,
  });

  if (existingMembership) {
    return serializeProjectMember(existingMembership);
  }

  const membership = await client.projectMember.create({
    data: {
      projectId,
      userId,
      role,
    },
    include: projectMemberWithUserInclude,
  });

  return serializeProjectMember(membership);
}

export async function ensureProjectMemberships(
  client: ProjectMemberClient,
  projectId: string,
  users: Array<{ userId: string; role: ProjectRole }>,
) {
  for (const member of users) {
    await ensureProjectMembership(client, projectId, member.userId, member.role);
  }
}

export async function listProjectMembers(
  user: AuthUser,
  projectId: string,
): Promise<ProjectMembersPayload> {
  const membership = await requireProjectMembership(prisma, user.id, projectId);

  const [members, availableUsers] = await Promise.all([
    prisma.projectMember.findMany({
      where: {
        projectId,
      },
      include: projectMemberWithUserInclude,
      orderBy: [
        {
          role: "asc",
        },
        {
          user: {
            name: "asc",
          },
        },
      ],
    }),
    membership.role === "ADMIN"
      ? prisma.user.findMany({
          where: {
            projectMembers: {
              none: {
                projectId,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
          select: userSummarySelect,
        })
      : Promise.resolve([]),
  ]);

  return {
    project: serializeMembershipProject(membership),
    currentUserRole: membership.role,
    members: members.map(serializeProjectMember),
    availableUsers: availableUsers.map(serializeUser),
  };
}

function assertValidRole(role: string): asserts role is PrismaProjectRole {
  const validRoles: ProjectRole[] = ["ADMIN", "QA", "DEVELOPER", "VIEWER"];

  if (!validRoles.includes(role as ProjectRole)) {
    throw badRequest("Invalid project role.");
  }
}

async function countProjectAdmins(
  client: ProjectMemberClient,
  projectId: string,
) {
  return client.projectMember.count({
    where: {
      projectId,
      role: "ADMIN",
    },
  });
}

export async function addProjectMember(
  user: AuthUser,
  projectId: string,
  input: {
    userId: string;
    role: ProjectRole;
  },
): Promise<ProjectMemberRecord> {
  assertValidRole(input.role);
  await requireProjectAdmin(prisma, user.id, projectId);

  const existingMembership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: input.userId,
      },
    },
    include: projectMemberWithUserInclude,
  });

  if (existingMembership) {
    throw conflict("That user is already a member of this project.");
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (!targetUser) {
    throw notFound("User not found.");
  }

  const membership = await prisma.projectMember.create({
    data: {
      projectId,
      userId: input.userId,
      role: input.role,
    },
    include: projectMemberWithUserInclude,
  });

  return serializeProjectMember(membership);
}

export async function updateProjectMemberRole(
  user: AuthUser,
  projectId: string,
  memberId: string,
  input: {
    role: ProjectRole;
  },
): Promise<ProjectMemberRecord> {
  assertValidRole(input.role);
  await requireProjectAdmin(prisma, user.id, projectId);

  const existingMembership = await prisma.projectMember.findFirst({
    where: {
      id: memberId,
      projectId,
    },
    include: projectMemberWithUserInclude,
  });

  if (!existingMembership) {
    throw notFound("Project member not found.");
  }

  if (existingMembership.role === "ADMIN" && input.role !== "ADMIN") {
    const adminCount = await countProjectAdmins(prisma, projectId);

    if (adminCount <= 1) {
      throw badRequest("A project must always have at least one admin.");
    }
  }

  const membership = await prisma.projectMember.update({
    where: {
      id: memberId,
    },
    data: {
      role: input.role,
    },
    include: projectMemberWithUserInclude,
  });

  return serializeProjectMember(membership);
}

export async function removeProjectMember(
  user: AuthUser,
  projectId: string,
  memberId: string,
) {
  await requireProjectAdmin(prisma, user.id, projectId);

  const existingMembership = await prisma.projectMember.findFirst({
    where: {
      id: memberId,
      projectId,
    },
    include: projectMemberWithUserInclude,
  });

  if (!existingMembership) {
    throw notFound("Project member not found.");
  }

  if (existingMembership.role === "ADMIN") {
    const adminCount = await countProjectAdmins(prisma, projectId);

    if (adminCount <= 1) {
      throw badRequest("A project must always have at least one admin.");
    }
  }

  await prisma.projectMember.delete({
    where: {
      id: memberId,
    },
  });

  return {
    deleted: true,
  };
}
