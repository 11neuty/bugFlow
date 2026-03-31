"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

interface ToastViewportProps {
  toasts: Array<{
    id: string;
    title: string;
    description?: string;
    tone?: ToastTone;
  }>;
  onDismiss: (id: string) => void;
}

const toneClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-slate-200 bg-white text-slate-900",
} as const;

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-3xl border px-4 py-3 shadow-lg",
            toneClasses[toast.tone ?? "info"],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="text-sm opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <button
              className="rounded-full p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
