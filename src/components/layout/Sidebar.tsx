"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  Brain,
  Layers,
  BarChart3,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Upload", icon: Upload, href: "/upload" },
  { label: "Chat", icon: MessageSquare, href: "/chat" },
  { label: "Quizzes", icon: Brain, href: "/quiz" },
  { label: "Flashcards", icon: Layers, href: "/flashcards" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = profile?.fullName || user?.email || "User";
  const displayEmail = user?.email || "";

  const navContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
          <BookOpen className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
          RAG Learn
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-100/60 dark:text-gray-400 dark:hover:bg-white/5"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-blue-500/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="relative h-5 w-5 shrink-0" />
                <span className="relative">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200/60 dark:border-gray-700/40 px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar
            name={displayName}
            image={profile?.avatarUrl}
            size="sm"
          />
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {displayEmail}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/40 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>

      <aside className="hidden md:flex md:w-[260px] md:shrink-0">
        <div className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          {navContent}
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white dark:bg-gray-900 shadow-2xl md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
