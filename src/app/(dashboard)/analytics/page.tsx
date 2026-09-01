"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  FileText,
  Brain,
  TrendingUp,
  BookOpen,
  Calendar,
  Activity,
  Layers,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import Badge from "@/components/ui/Badge";
import { formatDate, formatRelativeDate, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface DocumentRow {
  id: string;
  title: string;
  file_name: string;
  page_count: number | null;
  status: string;
  created_at: string;
}

interface QuizAttemptRow {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface FlashcardDeckRow {
  id: string;
  title: string;
  card_count: number;
  created_at: string;
}

interface FlashcardRow {
  id: string;
  deck_id: string;
  created_at: string;
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

async function fetchAnalyticsData() {
  const [docRes, attemptRes, deckRes, flashcardRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id,title,file_name,page_count,status,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("quiz_attempts")
      .select("id,score,total_questions,completed_at")
      .order("completed_at", { ascending: false }),
    supabase
      .from("flashcard_decks")
      .select("id,title,card_count,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcards")
      .select("id,deck_id,created_at"),
  ]);

  if (docRes.error) throw new Error(docRes.error.message);
  if (attemptRes.error) throw new Error(attemptRes.error.message);
  if (deckRes.error) throw new Error(deckRes.error.message);
  if (flashcardRes.error) throw new Error(flashcardRes.error.message);

  return {
    documents: (docRes.data as DocumentRow[] | null) ?? [],
    attempts: (attemptRes.data as QuizAttemptRow[] | null) ?? [],
    decks: (deckRes.data as FlashcardDeckRow[] | null) ?? [],
    flashcards: (flashcardRes.data as FlashcardRow[] | null) ?? [],
  };
}

function getQuizChartData(attempts: QuizAttemptRow[]) {
  const sorted = [...attempts]
    .filter((a) => a.total_questions > 0)
    .sort(
      (a, b) =>
        new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
    );

  const last10 = sorted.slice(-10);

  return last10.map((a, i) => ({
    name: `Quiz ${i + 1}`,
    score: Math.round((a.score / a.total_questions) * 100),
    date: formatDate(a.completed_at, "MMM d"),
  }));
}

function getWeeklyUploadData(documents: DocumentRow[]) {
  const now = new Date();
  const weeks: { label: string; count: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7 + now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const count = documents.filter((d) => {
      const created = new Date(d.created_at);
      return created >= weekStart && created <= weekEnd;
    }).length;

    weeks.push({
      label: formatDate(weekStart, "MMM d"),
      count,
    });
  }

  return weeks;
}

function calculateReviewStreak(attempts: QuizAttemptRow[], flashcards: FlashcardRow[]) {
  const allDates = [
    ...attempts.map((a) => a.completed_at),
    ...flashcards.map((f) => f.created_at),
  ];

  if (allDates.length === 0) return 0;

  const uniqueDays = new Set(
    allDates.map((d) => new Date(d).toDateString())
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    if (uniqueDays.has(checkDate.toDateString())) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default function AnalyticsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
  const [decks, setDecks] = useState<FlashcardDeckRow[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchAnalyticsData();
        if (!cancelled) {
          setDocuments(data.documents);
          setAttempts(data.attempts);
          setDecks(data.decks);
          setFlashcards(data.flashcards);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalQuizzes = attempts.length;
    const scores = attempts
      .filter((a) => a.total_questions > 0)
      .map((a) => (a.score / a.total_questions) * 100);
    const averageScore =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore =
      scores.length === 0 ? 0 : Math.round(Math.max(...scores));
    const totalFlashcards = decks.reduce((acc, d) => acc + d.card_count, 0);
    const streak = calculateReviewStreak(attempts, flashcards);

    return {
      totalDocuments: documents.length,
      totalQuizzes,
      averageScore,
      bestScore,
      totalDecks: decks.length,
      totalFlashcards,
      streak,
    };
  }, [documents, attempts, decks, flashcards]);

  const quizChartData = useMemo(() => getQuizChartData(attempts), [attempts]);
  const weeklyUploadData = useMemo(
    () => getWeeklyUploadData(documents),
    [documents]
  );

  const recentActivities = useMemo(() => {
    const activities: {
      type: "document" | "quiz" | "flashcard";
      title: string;
      date: string;
      icon: typeof FileText;
      color: string;
    }[] = [];

    documents.slice(0, 5).forEach((d) => {
      activities.push({
        type: "document",
        title: `Uploaded ${d.title}`,
        date: d.created_at,
        icon: FileText,
        color: "text-blue-500 bg-blue-500/10",
      });
    });

    attempts.slice(0, 5).forEach((a) => {
      activities.push({
        type: "quiz",
        title: `Quiz scored ${Math.round((a.score / a.total_questions) * 100)}%`,
        date: a.completed_at,
        icon: Brain,
        color: "text-purple-500 bg-purple-500/10",
      });
    });

    decks.slice(0, 5).forEach((d) => {
      activities.push({
        type: "flashcard",
        title: `Created deck "${d.title}"`,
        date: d.created_at,
        icon: Layers,
        color: "text-orange-500 bg-orange-500/10",
      });
    });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [documents, attempts, decks]);

  const statCards = [
    {
      label: "Documents",
      value: stats.totalDocuments,
      icon: FileText,
      accent: "text-blue-500",
      glow: "bg-blue-500/10",
    },
    {
      label: "Quizzes Taken",
      value: stats.totalQuizzes,
      icon: Brain,
      accent: "text-purple-500",
      glow: "bg-purple-500/10",
    },
    {
      label: "Avg Score",
      value: `${stats.averageScore}%`,
      icon: TrendingUp,
      accent: "text-emerald-500",
      glow: "bg-emerald-500/10",
    },
    {
      label: "Best Score",
      value: `${stats.bestScore}%`,
      icon: TrendingUp,
      accent: "text-amber-500",
      glow: "bg-amber-500/10",
    },
    {
      label: "Flashcard Decks",
      value: stats.totalDecks,
      icon: Layers,
      accent: "text-orange-500",
      glow: "bg-orange-500/10",
    },
    {
      label: "Total Flashcards",
      value: stats.totalFlashcards,
      icon: BookOpen,
      accent: "text-rose-500",
      glow: "bg-rose-500/10",
    },
    {
      label: "Review Streak",
      value: `${stats.streak}d`,
      icon: Activity,
      accent: "text-cyan-500",
      glow: "bg-cyan-500/10",
    },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case "ready":
        return "success";
      case "processing":
        return "warning";
      case "error":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8"
    >
      <motion.div variants={item} className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track your study progress and performance across all activities.
        </p>
      </motion.div>

      {error && (
        <motion.div
          variants={item}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Stats overview */}
      {loading ? (
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton variant="circular" className="h-10 w-10" />
              </div>
            </Card>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map(({ label, value, icon: Icon, accent, glow }) => (
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

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Quiz performance chart */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quiz Performance
            </h2>
            <Brain className="h-5 w-5 text-purple-500" />
          </div>
          {loading ? (
            <div className="h-64">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : quizChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No quiz data yet. Take a quiz to see your performance.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quizChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                    labelStyle={{ color: "#374151", fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Weekly uploads bar chart */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Study Activity
            </h2>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          {loading ? (
            <div className="h-64">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyUploadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                    labelStyle={{ color: "#374151", fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    name="Documents"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* Flashcard progress */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Flashcard Progress
            </h2>
            <Layers className="h-5 w-5 text-orange-500" />
          </div>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : decks.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No flashcard decks yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {decks.map((deck) => (
                <div key={deck.id}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {deck.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {deck.card_count} cards
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 20,
                        delay: 0.2,
                      }}
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent activity timeline */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <Activity className="h-5 w-5 text-emerald-500" />
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
          ) : recentActivities.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No activity yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {recentActivities.map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <motion.li
                    key={`${activity.type}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        activity.color
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(activity.date)}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </Card>
      </motion.div>

      {/* Document stats table */}
      <motion.div variants={item}>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documents
            </h2>
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No documents uploaded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200/60 dark:border-gray-700/60">
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">
                      Title
                    </th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">
                      File
                    </th>
                    <th className="hidden pb-3 font-medium text-gray-500 dark:text-gray-400 sm:table-cell">
                      Pages
                    </th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="hidden pb-3 font-medium text-gray-500 dark:text-gray-400 md:table-cell">
                      Uploaded
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 pr-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {doc.title}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                        {doc.file_name}
                      </td>
                      <td className="hidden py-3 pr-4 text-gray-500 dark:text-gray-400 sm:table-cell">
                        {doc.page_count ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant(doc.status)}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="hidden py-3 text-gray-500 dark:text-gray-400 md:table-cell">
                        {formatDate(doc.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
