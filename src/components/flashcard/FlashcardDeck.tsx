"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlashcardDeckProps {
  front: string;
  back: string;
  difficulty?: "easy" | "medium" | "hard";
  className?: string;
}

const difficultyStyles = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function FlashcardDeck({
  front,
  back,
  difficulty,
  className,
}: FlashcardDeckProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={cn("relative cursor-pointer", className)}
      style={{ perspective: "1000px" }}
      onClick={() => setIsFlipped((f) => !f)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-full w-full"
      >
        {/* Front */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-2xl",
            "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
            "border border-gray-200/50 dark:border-gray-700/50",
            "shadow-sm shadow-gray-200/50 dark:shadow-black/20",
            "p-6 text-center",
            isFlipped && "pointer-events-none"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          {difficulty && (
            <span
              className={cn(
                "absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                difficultyStyles[difficulty]
              )}
            >
              {difficulty}
            </span>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">Front</p>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            {front}
          </p>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Click to flip
          </p>
        </div>

        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800",
            "border border-blue-200/50 dark:border-gray-700/50",
            "shadow-sm shadow-gray-200/50 dark:shadow-black/20",
            "p-6 text-center",
            !isFlipped && "pointer-events-none"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {difficulty && (
            <span
              className={cn(
                "absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                difficultyStyles[difficulty]
              )}
            >
              {difficulty}
            </span>
          )}
          <p className="text-sm text-blue-500 dark:text-blue-400">Back</p>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            {back}
          </p>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Click to flip back
          </p>
        </div>
      </motion.div>
    </div>
  );
}
