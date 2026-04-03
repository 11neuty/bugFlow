import type { Prisma, PrismaClient } from "@prisma/client";

import { badRequest, conflict, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PROJECT_NAME } from "@/lib/projects";
import { projectSummarySelect, serializeProject } from "@/services/serializers";

type ProjectClient = Prisma.TransactionClient | PrismaClient;

const projectOrderBy = [
  {
    createdAt: "asc" as const,
  },
  {
    name: "asc" as const,
  },
];

export async function createProject(name: string) {
  const existingProject = await prisma.project.findFirst({
    where: {
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

  const project = await prisma.project.create({
    data: {
      name,
    },
    select: projectSummarySelect,
  });

  return serializeProject(project);
}

export async function getProjects() {
  await getOrCreateDefaultProject();

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: projectOrderBy,
    select: projectSummarySelect,
  });

  return projects.map(serializeProject);
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: projectSummarySelect,
  });

  if (!project) {
    throw notFound("Project not found.");
  }

  return serializeProject(project);
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

export async function deleteProject(id: string) {
  const project = await prisma.project.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    throw notFound("Project not found.");
  }

  if (project.name === DEFAULT_PROJECT_NAME) {
    throw badRequest("Default Project cannot be deleted.");
  }

  return prisma.$transaction(async (tx) => {
    const fallbackProject = await getOrCreateDefaultProject(tx);

    if (fallbackProject.id === project.id) {
      throw badRequest("Default Project cannot be deleted.");
    }

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
