import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200/70 bg-white/92 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
