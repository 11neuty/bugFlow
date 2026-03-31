"use client";

import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ className, label, error, hint, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-2">
      {label ? (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <input
        className={cn(
          "h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-blue-100",
          error ? "border-red-300 focus:ring-red-100" : "",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-sm text-red-600">{error}</span>
      ) : hint ? (
        <span className="text-sm text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}
