"use client";

import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "circular" | "rectangular";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  circular: "h-12 w-12 rounded-full",
  rectangular: "h-24 w-full rounded-xl",
};

export default function Skeleton({
  variant = "text",
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse",
        variantStyles[variant],
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
    </div>
  );
}
