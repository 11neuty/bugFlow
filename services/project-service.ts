import { conflict, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { projectSummarySelect, serializeProject } from "@/services/serializers";

export const DEFAULT_PROJECT_NAME = "Default Project";

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
    orderBy: projectOrderBy,
    select: projectSummarySelect,
  });

  return projects.map(serializeProject);
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: {
      id,
    },
    select: projectSummarySelect,
  });

  if (!project) {
    throw notFound("Project not found.");
  }

  return serializeProject(project);
}

export async function getOrCreateDefaultProject() {
  const project = await prisma.project.upsert({
    where: {
      name: DEFAULT_PROJECT_NAME,
    },
    update: {},
    create: {
      name: DEFAULT_PROJECT_NAME,
    },
    select: projectSummarySelect,
  });

  return serializeProject(project);
}
