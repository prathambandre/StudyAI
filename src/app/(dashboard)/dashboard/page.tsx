"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  BookOpen,
  Brain,
  FileText,
  MessageSquare,
  TrendingUp,
  FileUp,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  formatRelativeDate,
  truncateText,
  cn,
} from "@/lib/utils";

interface DocumentRow {
  id: string;
  title: string;
  fileName?: string;
  created_at: string;
  page_count?: number;
}

interface QuizAttemptRow {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  quiz_id: string;
}

const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function DashboardPage() {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRow[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const { supabase } = await import("@/lib/supabase/client");

        const [docRes, quizRes, decksRes] = await Promise.all([
          supabase
            .from("documents")
            .select("id,title,created_at,page_count")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("quiz_attempts")
            .select("id,score,total_questions,completed_at,quiz_id")
            .order("completed_at", { ascending: false }),
          supabase.from("flashcard_decks").select("id", { count: "exact" }),
        ]);

        if (docRes.error) throw new Error(docRes.error.message);
        if (quizRes.error) throw new Error(quizRes.error.message);
        if (decksRes.error) throw new Error(decksRes.error.message);

        if (cancelled) return;
        setError(null);
        setDocuments((docRes.data as DocumentRow[] | null) ?? []);
        setQuizAttempts((quizRes.data as QuizAttemptRow[] | null) ?? []);
        setFlashcardCount(decksRes.count ?? 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalQuizzes = quizAttempts.length;
    const averageScore =
      totalQuizzes === 0
        ? 0
        : Math.round(
            quizAttempts.reduce(
              (acc, a) => acc + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0),
              0
            ) / totalQuizzes
          );

    return {
      totalDocuments: documents.length,
      totalQuizzes,
      averageScore,
      totalFlashcards: flashcardCount,
    };
  }, [documents, quizAttempts, flashcardCount]);

  const displayName = profile?.fullName || user?.email?.split("@")[0] || "there";

  const statCards = [
    {
      label: "Documents uploaded",
      value: stats.totalDocuments,
      suffix: "",
      icon: FileText,
      accent: "text-blue-500",
      glow: "bg-blue-500/10",
    },
    {
      label: "Quizzes taken",
      value: stats.totalQuizzes,
      suffix: "",
      icon: Brain,
      accent: "text-purple-500",
      glow: "bg-purple-500/10",
    },
    {
      label: "Average score",
      value: stats.averageScore,
      suffix: "%",
      icon: TrendingUp,
      accent: "text-emerald-500",
      glow: "bg-emerald-500/10",
    },
    {
      label: "Flashcards mastered",
      value: stats.totalFlashcards,
      suffix: "",
      icon: BookOpen,
      accent: "text-orange-500",
      glow: "bg-orange-500/10",
    },
  ];

  const chartData = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const w of weekdayOrder) buckets.set(w, { sum: 0, count: 0 });

    for (const a of quizAttempts) {
      const day = weekdayOrder[new Date(a.completed_at).getDay()];
      const bucket = buckets.get(day);
      if (!bucket) continue;
      bucket.sum += a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0;
      bucket.count += 1;
    }

    return weekdayOrder.map((w) => {
      const b = buckets.get(w)!;
      return { label: w, value: b.count > 0 ? Math.round(b.sum / b.count) : 0 };
    });
  }, [quizAttempts]);

  const quickActions = [
    {
      label: "Upload Document",
      description: "Upload a PDF to study",
      icon: FileUp,
      href: "/upload",
      variant: "primary" as const,
    },
    {
      label: "Start Chat",
      description: "Ask questions about documents",
      icon: MessageSquare,
      href: "/chat",
      variant: "secondary" as const,
    },
    {
      label: "Take Quiz",
      description: "Test your knowledge",
      icon: Brain,
      href: "/quiz",
      variant: "secondary" as const,
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8"
    >
      {/* Welcome */}
      <motion.div variants={item} className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-apple-blue to-apple-purple bg-clip-text text-transparent">
            {displayName}
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your study materials today.
        </p>
      </motion.div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton variant="circular" className="h-10 w-10" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map(({ label, value, suffix, icon: Icon, accent, glow }) => (
            <motion.div key={label} variants={item}>
              <Card hover className="relative overflow-hidden p-5">
                <div
                  className={cn(
                    "pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-2xl",
                    glow
                  )}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {value}
                      {suffix}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      glow,
                      accent
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {error && (
        <motion.div
          variants={item}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        variants={item}
        className="grid gap-6 lg:grid-cols-5"
      >
        {/* Recent activity */}
        <Card className="p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent activity
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton variant="circular" className="h-9 w-9 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 && quizAttempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No activity yet. Upload a document to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {documents.slice(0, 3).map((doc) => (
                <li key={`doc-${doc.id}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <FileText className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {truncateText(doc.title, 45)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Document · {formatRelativeDate(doc.created_at)}
                      {doc.page_count ? ` · ${doc.page_count} pages` : ""}
                    </p>
                  </div>
                </li>
              ))}
              {quizAttempts.slice(0, 2).map((attempt) => (
                <li key={`quiz-${attempt.id}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <Brain className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Completed a quiz
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Score {Math.round((attempt.score / attempt.total_questions) * 100)}% ·{" "}
                      {formatRelativeDate(attempt.completed_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick actions + chart */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Quick actions
            </h2>
            <div className="flex flex-col gap-3">
              {quickActions.map(({ label, description, icon: Icon, href, variant }) => (
                <Link key={href} href={href}>
                  <Button
                    variant={variant}
                    className="w-full"
                    icon={<Icon className="h-4 w-4" />}
                    size="md"
                  >
                    <span className="flex-1 text-left">
                      <span className="block">{label}</span>
                      <span className="block text-xs font-normal text-gray-400 dark:text-gray-400">
                        {description}
                      </span>
                    </span>
                  </Button>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance
              </h2>
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            {loading ? (
              <div className="flex h-40 items-end gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-full flex-1 rounded-lg" />
                ))}
              </div>
            ) : chartData.every((d) => d.value === 0) ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                <TrendingUp className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Complete a quiz to see your weekly performance.
                </p>
              </div>
            ) : (
              <div className="flex h-40 items-end gap-3">
                {chartData.map((d, i) => (
                  <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${d.value}%` }}
                      transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 120, damping: 18 }}
                      className="w-full rounded-lg bg-gradient-to-t from-apple-blue/70 to-apple-purple/70"
                      style={{ minHeight: 8 }}
                    />
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
