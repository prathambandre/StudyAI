"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "Upload",
  "/chat": "Chat",
  "/quiz": "Quizzes",
  "/flashcards": "Flashcards",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let href = "";
  for (const seg of segments) {
    href += "/" + seg;
    crumbs.push({
      label: pageTitles[href] || seg.charAt(0).toUpperCase() + seg.slice(1),
      href,
    });
  }
  return crumbs;
}

export default function Header() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = pageTitles[pathname] || breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";
  const displayName = profile?.fullName || user?.email || "User";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 md:px-6 gap-4">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search documents, quizzes, flashcards..."
            className="w-full rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-100/50 dark:bg-white/5 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Avatar
          name={displayName}
          image={profile?.avatarUrl}
          size="sm"
        />
      </div>
    </header>
  );
}
