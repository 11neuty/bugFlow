"use client";

import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.5)]",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
