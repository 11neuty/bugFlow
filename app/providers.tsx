"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/AuthProvider";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
