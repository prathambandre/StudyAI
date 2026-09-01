"use client";

import { useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

function getSnapshot() {
  return localStorage.getItem("theme") ?? "light";
}

function getServerSnapshot() {
  return "light";
}

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === "theme") callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export default function ThemeToggle() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = stored === "dark";

  const toggle = () => {
    const next = dark ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <button
      onClick={toggle}
      className="relative flex h-8 w-14 items-center rounded-full bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm p-1 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      aria-label="Toggle theme"
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md"
        style={{ x: dark ? 24 : 0 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {dark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-3.5 w-3.5 text-gray-800" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
