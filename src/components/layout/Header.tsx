"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Search, Layers, Brain, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "Upload",
  "/chat": "Chat",
  "/quiz": "Quizzes",
  "/flashcards": "Flashcards",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

interface SearchResult {
  kind: "document" | "quiz" | "deck";
  id: string;
  title: string;
  icon: typeof FileText;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = pageTitles[pathname] || "Dashboard";
  const displayName = profile?.fullName || user?.email || "User";

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const pattern = `%${q.trim()}%`;
      const [docRes, quizRes, deckRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id,title")
          .ilike("title", pattern)
          .limit(5),
        supabase
          .from("quizzes")
          .select("id,title")
          .ilike("title", pattern)
          .limit(5),
        supabase
          .from("flashcard_decks")
          .select("id,title")
          .ilike("title", pattern)
          .limit(5),
      ]);

      const next: SearchResult[] = [];
      if (!docRes.error) {
        for (const d of docRes.data ?? []) {
          next.push({ kind: "document", id: d.id, title: d.title, icon: FileText });
        }
      }
      if (!quizRes.error) {
        for (const qq of quizRes.data ?? []) {
          next.push({ kind: "quiz", id: qq.id, title: qq.title, icon: Brain });
        }
      }
      if (!deckRes.error) {
        for (const d of deckRes.data ?? []) {
          next.push({ kind: "deck", id: d.id, title: d.title, icon: Layers });
        }
      }
      setResults(next);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (r.kind === "document") {
      router.push(`/chat?document=${r.id}`);
    } else if (r.kind === "quiz") {
      router.push(`/quiz/${r.id}`);
    } else {
      router.push(`/flashcards/${r.id}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 md:px-6 gap-4">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="relative hidden md:flex items-center gap-2 flex-1 max-w-sm mx-auto">
        <div className="relative w-full" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search documents, quizzes, flashcards..."
            className="w-full rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-100/50 dark:bg-white/5 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />

          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400 dark:text-gray-500" />
          )}

          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-xl shadow-gray-900/5 dark:shadow-black/20">
              {searching ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No results for &quot;{query.trim()}&quot;
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {results.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => go(r)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-white/5 transition-colors"
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            r.kind === "document" && "bg-blue-500/10 text-blue-500",
                            r.kind === "quiz" && "bg-purple-500/10 text-purple-500",
                            r.kind === "deck" && "bg-orange-500/10 text-orange-500"
                          )}
                        >
                          <r.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{r.title}</span>
                        <span className="shrink-0 text-xs capitalize text-gray-400 dark:text-gray-500">
                          {r.kind === "document"
                            ? "document"
                            : r.kind === "quiz"
                              ? "quiz"
                              : "flashcards"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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