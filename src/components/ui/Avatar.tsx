"use client";

import { cn, getInitials } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

const dotSizes: Record<AvatarSize, string> = {
  sm: "h-2 w-2 border",
  md: "h-2.5 w-2.5 border-[1.5px]",
  lg: "h-3.5 w-3.5 border-2",
};

const gradients = [
  "from-blue-500 to-indigo-500",
  "from-violet-500 to-purple-500",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-red-500",
  "from-cyan-500 to-blue-500",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Avatar({
  name,
  image,
  size = "md",
  online,
  className,
}: AvatarProps) {
  const gradient = gradients[hashName(name) % gradients.length];

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {image ? (
        <img
          src={image}
          alt={name}
          className={cn(
            "rounded-full object-cover ring-2 ring-white/80 dark:ring-gray-900/80",
            sizeStyles[size]
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white/80 dark:ring-gray-900/80",
            gradient,
            sizeStyles[size]
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-white dark:border-gray-900",
            online ? "bg-emerald-500" : "bg-gray-400",
            dotSizes[size]
          )}
        />
      )}
    </div>
  );
}
