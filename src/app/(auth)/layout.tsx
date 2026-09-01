"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";

const floatingShapes = [
  { size: 80, x: "10%", y: "20%", delay: 0, duration: 6 },
  { size: 60, x: "70%", y: "15%", delay: 1, duration: 8 },
  { size: 40, x: "30%", y: "70%", delay: 2, duration: 7 },
  { size: 100, x: "80%", y: "60%", delay: 0.5, duration: 9 },
  { size: 50, x: "50%", y: "40%", delay: 1.5, duration: 5 },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {floatingShapes.map((shape, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: shape.size,
              height: shape.size,
              left: shape.x,
              top: shape.y,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: shape.duration,
              repeat: Infinity,
              delay: shape.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                StudyAI
              </h1>
            </div>
            <p className="text-lg text-blue-100 max-w-sm mx-auto leading-relaxed">
              Learn smarter with AI-powered study tools. Upload documents, get
              instant answers, and master any subject.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-blue-200">
              <Sparkles className="h-4 w-4" />
              <span>Trusted by students worldwide</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              StudyAI
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
