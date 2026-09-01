"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({
  children,
  className,
  hover = false,
  ...props
}: CardProps) {
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl",
          "border border-gray-200/50 dark:border-gray-700/50",
          "shadow-sm shadow-gray-200/50 dark:shadow-black/20",
          "transition-colors duration-200",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl",
        "border border-gray-200/50 dark:border-gray-700/50",
        "shadow-sm shadow-gray-200/50 dark:shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}
