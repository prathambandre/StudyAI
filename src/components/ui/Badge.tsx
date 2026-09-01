"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  success:
    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  warning:
    "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  danger:
    "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  info:
    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
};

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
