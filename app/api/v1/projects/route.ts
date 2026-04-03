import type { NextRequest } from "next/server";

import { apiSuccess } from "@/lib/api-response";
import { createProjectSchema } from "@/lib/schemas";
import { withAuthRoute } from "@/middleware/auth";
import {
  createProject,
  getProjects,
} from "@/services/project-service";

export async function GET(request: NextRequest) {
  return withAuthRoute(request, async () => {
    const projects = await getProjects();

    return apiSuccess(projects, 200);
  });
}

export async function POST(request: NextRequest) {
  return withAuthRoute(request, async () => {
    const body = await request.json();
    const input = createProjectSchema.parse(body);
    const project = await createProject(input.name);

    return apiSuccess(project, 201);
  });
}
