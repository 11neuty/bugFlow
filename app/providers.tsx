"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/AuthProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
