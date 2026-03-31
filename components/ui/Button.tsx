"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[color:var(--color-primary)] text-white shadow-[0_14px_30px_-20px_rgba(37,99,235,0.8)] hover:bg-[#1d4ed8]",
  secondary:
    "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-[color:var(--color-danger)] text-white shadow-[0_14px_30px_-20px_rgba(220,38,38,0.8)] hover:bg-[#b91c1c]",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  leadingIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
    </button>
  );
}
