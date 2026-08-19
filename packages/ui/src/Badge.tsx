import React from "react";

type BadgeVariant = "default" | "beginner" | "intermediate" | "advanced";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-700 text-zinc-200",
  beginner: "bg-emerald-900/60 text-emerald-300",
  intermediate: "bg-amber-900/60 text-amber-300",
  advanced: "bg-red-900/60 text-red-300",
};

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
