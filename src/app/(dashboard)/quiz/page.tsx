"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Brain,
  Plus,
  GraduationCap,
  Clock,
  RotateCcw,
  FileText,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { formatDate, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface QuizRow {
  id: string;
  title: string;
  document_id?: string | null;
  document_title?: string | null;
  question_count?: number | null;
  created_at: string;
}

interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface DocumentRow {
  id: string;
  title: string;
}

interface GeneratedQuiz {
  id: string;
}

type QuizType = "multiple_choice" | "true_false" | "mixed";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
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

const questionCounts = [5, 10, 15, 20];

async function fetchQuizData() {
  const [quizRes, docRes, attemptRes] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id,title,document_id,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id,title")
      .eq("status", "ready")
      .order("created_at", { ascending: false }),
    supabase
      .from("quiz_attempts")
      .select("id,quiz_id,score,total_questions,completed_at")
      .order("completed_at", { ascending: false }),
  ]);

  if (quizRes.error) throw new Error(quizRes.error.message);
  if (docRes.error) throw new Error(docRes.error.message);
  if (attemptRes.error) throw new Error(attemptRes.error.message);

  return {
    quizzes: (quizRes.data as QuizRow[] | null) ?? [],
    documents: (docRes.data as DocumentRow[] | null) ?? [],
    attempts: (attemptRes.data as QuizAttemptRow[] | null) ?? [],
  };
}

export default function QuizPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [quizType, setQuizType] = useState<QuizType>("mixed");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchQuizData();
        if (!cancelled) {
          setQuizzes(data.quizzes);
          setDocuments(data.documents);
          setAttempts(data.attempts);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load quizzes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const documentTitleMap = useMemo(
    () => Object.fromEntries(documents.map((d) => [d.id, d.title])),
    [documents]
  );

  const lastAttemptScores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const attempt of attempts) {
      if (map[attempt.quiz_id] === undefined) {
        map[attempt.quiz_id] =
          attempt.total_questions > 0
            ? Math.round((attempt.score / attempt.total_questions) * 100)
            : 0;
      }
    }
    return map;
  }, [attempts]);

  const generateQuiz = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocument,
          questionCount,
          quizType,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Generation failed (${res.status})`);
      }

      const quiz = data?.quiz as GeneratedQuiz | undefined;
      const quizId = quiz?.id ?? data?.id ?? data?.quizId;

      setModalOpen(false);
      try {
        const data = await fetchQuizData();
        setQuizzes(data.quizzes);
        setDocuments(data.documents);
        setAttempts(data.attempts);
      } catch {
        // Non-fatal: generation succeeded, refresh list silently.
      }

      if (quizId) {
        router.push(`/quiz/${quizId}`);
      }
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "Failed to generate quiz. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedDocument, questionCount, quizType, router]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Quizzes
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Test your knowledge with quizzes generated from your documents.
          </p>
        </div>
        <Button
          onClick={() => {
            setGenerateError(null);
            setModalOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
        >
          Generate New Quiz
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyQuizState
          onGenerate={() => {
            setGenerateError(null);
            setModalOpen(true);
          }}
          hasDocuments={documents.length > 0}
        />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {quizzes.map((quiz) => {
            const score = lastAttemptScores[quiz.id];
            const hasAttempt = score !== undefined;
            const docTitle = quiz.document_id
              ? documentTitleMap[quiz.document_id] ?? null
              : null;

            return (
              <motion.div key={quiz.id} variants={item}>
                <Card hover className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                      <Brain className="h-5 w-5" />
                    </span>
                    {hasAttempt && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          score >= 70
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : score >= 50
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}
                      >
                        {score}%
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                    {quiz.title}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(quiz.created_at)}
                    </span>
                    {docTitle && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{docTitle}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex-1" />
                  <Link href={`/quiz/${quiz.id}`} className="mt-4">
                    <Button
                      variant={hasAttempt ? "secondary" : "primary"}
                      className="w-full"
                      icon={
                        hasAttempt ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <GraduationCap className="h-4 w-4" />
                        )
                      }
                    >
                      {hasAttempt ? "Retake Quiz" : "Take Quiz"}
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Generate quiz modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!generating) setModalOpen(false);
        }}
        title="Generate New Quiz"
      >
        <div className="flex flex-col gap-5">
          {generateError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {generateError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Document
            </label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200/60 bg-white/80 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700/60 dark:bg-gray-900/80 dark:text-gray-100"
              >
                {documents.length === 0 && <option value="">No documents available</option>}
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {documents.length === 0 && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Upload a document first to generate a quiz.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of questions
            </label>
            <div className="grid grid-cols-4 gap-2">
              {questionCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={cn(
                    "rounded-xl border py-2 text-sm font-medium transition-colors",
                    questionCount === count
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-gray-200/60 text-gray-700 hover:bg-gray-100 dark:border-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Question type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "multiple_choice", label: "Multiple Choice" },
                  { value: "true_false", label: "True/False" },
                  { value: "mixed", label: "Mixed" },
                ] as { value: QuizType; label: string }[]
              ).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setQuizType(type.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    quizType === type.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-gray-200/60 text-gray-700 hover:bg-gray-100 dark:border-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => void generateQuiz()}
            isLoading={generating}
            disabled={documents.length === 0 && !selectedDocument}
            icon={<Brain className="h-4 w-4" />}
          >
            Generate
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}

function EmptyQuizState({
  onGenerate,
  hasDocuments,
}: {
  onGenerate: () => void;
  hasDocuments: boolean;
}) {
  return (
    <motion.div variants={item}>
      <Card className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No quizzes yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Generate a quiz from one of your documents to test your knowledge.
          </p>
        </div>
        {!hasDocuments && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            You&apos;ll need to upload a document before generating a quiz.
          </p>
        )}
        <Button
          onClick={onGenerate}
          className="mt-2"
          icon={<Plus className="h-4 w-4" />}
          disabled={!hasDocuments}
        >
          Generate New Quiz
        </Button>
      </Card>
    </motion.div>
  );
}
