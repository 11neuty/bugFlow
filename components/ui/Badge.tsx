import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
  className?: string;
}

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
} as const;

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
