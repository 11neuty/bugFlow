import type { Prisma, PrismaClient } from "@prisma/client";

import { badRequest, conflict } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PROJECT_NAME } from "@/lib/projects";
import { projectSummarySelect, serializeProject } from "@/services/serializers";
import type { AuthUser } from "@/lib/types";
import {
  ensureProjectMembership,
  ensureProjectMemberships,
  mapGlobalRoleToProjectRole,
  requireProjectAdmin,
  requireProjectMembership,
} from "@/services/project-members-service";

type ProjectClient = Prisma.TransactionClient | PrismaClient;

export async function ensureUserHasProjectMembership(
  user: AuthUser,
  client: ProjectClient = prisma,
) {
  const membershipCount = await client.projectMember.count({
    where: {
      userId: user.id,
      project: {
        deletedAt: null,
      },
    },
  });

  if (membershipCount > 0) {
    return;
  }

  const defaultProject = await getOrCreateDefaultProject(client);
  await ensureProjectMembership(
    client,
    defaultProject.id,
    user.id,
    mapGlobalRoleToProjectRole(user.role),
  );
}

export async function createProjectForUser(user: AuthUser, name: string) {
  const existingProject = await prisma.project.findFirst({
    where: {
      deletedAt: null,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: projectSummarySelect,
  });

  if (existingProject) {
    throw conflict("Project name already exists.");
  }

  const project = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        name,
      },
      select: projectSummarySelect,
    });

    await ensureProjectMembership(tx, createdProject.id, user.id, "ADMIN");

    return createdProject;
  });

  return serializeProject(project, {
    currentUserRole: "ADMIN",
  });
}

export async function getProjects(user: AuthUser) {
  await getOrCreateDefaultProject();
  await ensureUserHasProjectMembership(user);

  const memberships = await prisma.projectMember.findMany({
    where: {
      userId: user.id,
      project: {
        deletedAt: null,
      },
    },
    orderBy: [
      {
        project: {
          createdAt: "asc",
        },
      },
      {
        project: {
          name: "asc",
        },
      },
    ],
    select: {
      role: true,
      project: {
        select: projectSummarySelect,
      },
    },
  });

  return memberships.map((membership) =>
    serializeProject(membership.project, {
      currentUserRole: membership.role,
    }),
  );
}

export async function getProjectById(user: AuthUser, id: string) {
  const membership = await requireProjectMembership(prisma, user.id, id);
  return serializeProject(membership.project, {
    currentUserRole: membership.role,
  });
}

export async function getOrCreateDefaultProject(client: ProjectClient = prisma) {
  const existingProject = await client.project.findUnique({
    where: {
      name: DEFAULT_PROJECT_NAME,
    },
    select: {
      ...projectSummarySelect,
      deletedAt: true,
    },
  });

  if (existingProject) {
    if (existingProject.deletedAt) {
      const restoredProject = await client.project.update({
        where: {
          id: existingProject.id,
        },
        data: {
          deletedAt: null,
        },
        select: projectSummarySelect,
      });

      return serializeProject(restoredProject);
    }

    return serializeProject(existingProject);
  }

  const createdProject = await client.project.create({
    data: {
      name: DEFAULT_PROJECT_NAME,
    },
    select: projectSummarySelect,
  });

  return serializeProject(createdProject);
}

export async function deleteProject(user: AuthUser, id: string) {
  const membership = await requireProjectAdmin(prisma, user.id, id);
  const project = membership.project;

  if (project.name === DEFAULT_PROJECT_NAME) {
    throw badRequest("Default Project cannot be deleted.");
  }

  return prisma.$transaction(async (tx) => {
    const fallbackProject = await getOrCreateDefaultProject(tx);
    const projectMembers = await tx.projectMember.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        userId: true,
        role: true,
      },
    });

    if (fallbackProject.id === project.id) {
      throw badRequest("Default Project cannot be deleted.");
    }

    await ensureProjectMemberships(tx, fallbackProject.id, projectMembers);

    const movedIssues = await tx.issue.updateMany({
      where: {
        projectId: project.id,
      },
      data: {
        projectId: fallbackProject.id,
      },
    });

    await tx.project.update({
      where: {
        id: project.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log("Moved issues:", movedIssues.count);

    return {
      deleted: true,
      fallbackProject,
      movedIssueCount: movedIssues.count,
    };
  });
}
