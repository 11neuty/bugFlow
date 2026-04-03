"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createProjectRequest, fetchProjects } from "@/api/projects";
import { useAuth } from "@/components/providers/AuthProvider";
import type { ProjectSummary } from "@/lib/types";

const PROJECT_STORAGE_KEY = "bugflow.project-id";

interface ProjectContextValue {
  projects: ProjectSummary[];
  selectedProject: ProjectSummary | null;
  selectedProjectId: string | null;
  isReady: boolean;
  isLoading: boolean;
  isCreateModalOpen: boolean;
  refreshProjects: (preferredProjectId?: string | null) => Promise<ProjectSummary[]>;
  selectProject: (projectId: string) => void;
  createProject: (name: string) => Promise<ProjectSummary>;
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function readStoredProjectId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(PROJECT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredProjectId(projectId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!projectId) {
    window.sessionStorage.removeItem(PROJECT_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(PROJECT_STORAGE_KEY, projectId);
}

function sortProjects(projects: ProjectSummary[]) {
  return [...projects].sort((left, right) => {
    const createdAtDiff =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { authorizedFetch, isReady: isAuthReady, user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const selectedProjectIdRef = useRef<string | null>(null);

  const commitSelectedProjectId = useCallback((projectId: string | null) => {
    selectedProjectIdRef.current = projectId;
    setSelectedProjectId(projectId);
    writeStoredProjectId(projectId);
  }, []);

  const refreshProjects = useCallback(
    async (preferredProjectId?: string | null) => {
      if (!user) {
        setProjects([]);
        commitSelectedProjectId(null);
        setIsLoading(false);
        setIsReady(true);
        return [];
      }

      setIsLoading(true);

      try {
        const projectList = sortProjects(await fetchProjects(authorizedFetch));
        const storedProjectId = readStoredProjectId();
        const nextSelectedProjectId =
          projectList.find(
            (project) =>
              project.id === preferredProjectId ||
              project.id === selectedProjectIdRef.current ||
              project.id === storedProjectId,
          )?.id ??
          projectList[0]?.id ??
          null;

        setProjects(projectList);
        commitSelectedProjectId(nextSelectedProjectId);
        setIsReady(true);
        return projectList;
      } finally {
        setIsLoading(false);
      }
    },
    [authorizedFetch, commitSelectedProjectId, user],
  );

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user) {
      setProjects([]);
      commitSelectedProjectId(null);
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadProjects = async () => {
      try {
        const projectList = await refreshProjects();

        if (cancelled) {
          return;
        }

        setProjects(projectList);
      } catch {
        if (!cancelled) {
          setProjects([]);
          commitSelectedProjectId(null);
          setIsReady(true);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [commitSelectedProjectId, isAuthReady, refreshProjects, user]);

  const createProject = useCallback(
    async (name: string) => {
      const project = await createProjectRequest(authorizedFetch, { name });
      setProjects((currentProjects) =>
        sortProjects([
          ...currentProjects.filter((currentProject) => currentProject.id !== project.id),
          project,
        ]),
      );
      commitSelectedProjectId(project.id);
      setIsReady(true);
      return project;
    },
    [authorizedFetch, commitSelectedProjectId],
  );

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectedProjectId,
        isReady,
        isLoading,
        isCreateModalOpen,
        refreshProjects,
        selectProject: commitSelectedProjectId,
        createProject,
        openCreateProjectModal: () => setIsCreateModalOpen(true),
        closeCreateProjectModal: () => setIsCreateModalOpen(false),
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProjects must be used within ProjectProvider.");
  }

  return context;
}
