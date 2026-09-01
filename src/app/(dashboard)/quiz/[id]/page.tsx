"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Brain,
  CircleCheck,
  CircleX,
  GraduationCap,
  Lightbulb,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizRow {
  id: string;
  title: string;
  document_id?: string | null;
  questions: QuizQuestion[];
  created_at: string;
}

export default function TakeQuizPage() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    attemptId: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: loadError } = await supabase
          .from("quizzes")
          .select("id,title,document_id,questions,created_at")
          .eq("id", quizId)
          .single();

        if (loadError) throw new Error(loadError.message);

        const quiz = data as QuizRow;
        if (!quiz.questions || quiz.questions.length === 0) {
          throw new Error("This quiz has no questions");
        }

        if (cancelled) return;
        setQuiz(quiz);
        setSelectedAnswers(Array(quiz.questions.length).fill(-1));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load quiz");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (result) return;
      setSelectedAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = optionIndex;
        return next;
      });
    },
    [currentIndex, result]
  );

  const goNext = useCallback(() => {
    if (!quiz) return;
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [quiz, currentIndex]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const calculateScore = useCallback((): number => {
    if (!quiz) return 0;
    return quiz.questions.reduce(
      (acc, q, i) => (selectedAnswers[i] === q.correctAnswer ? acc + 1 : acc),
      0
    );
  }, [quiz, selectedAnswers]);

  const submitQuiz = useCallback(async () => {
    if (!quiz || submitting) return;
    setSubmitting(true);
    setError(null);

    const score = calculateScore();
    let attemptId: string | null = null;

    try {
      const { data, error: insertError } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quiz.id,
          user_id: user?.id,
          answers: selectedAnswers,
          score,
          total_questions: quiz.questions.length,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      attemptId = (data as { id: string } | null)?.id ?? null;
    } catch (e) {
      setError(
        e instanceof Error
          ? `Quiz completed but failed to save attempt: ${e.message}`
          : "Failed to save attempt"
      );
    } finally {
      setSubmitting(false);
    }

    setResult({
      score,
      total: quiz.questions.length,
      attemptId,
    });
  }, [quiz, submitting, selectedAnswers, calculateScore, user]);

  const allAnswered = useMemo(
    () => selectedAnswers.every((a) => a >= 0),
    [selectedAnswers]
  );

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="mx-auto flex w-full max-w-2xl">
        <Card className="flex flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <CircleX className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Couldn&apos;t load this quiz
          </p>
          <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <Link
            href="/quiz"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to quizzes
          </Link>
        </Card>
      </div>
    );
  }

  if (!quiz) return null;

  const question = quiz.questions[currentIndex];
  if (!question) return null;

  const percentage = Math.round((result ? result.score : calculateScore()) / quiz.questions.length * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to quizzes</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
          {quiz.title}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <Results
            key="results"
            quiz={quiz}
            selectedAnswers={selectedAnswers}
            score={result.score}
            total={result.total}
            percentage={percentage}
            onBack={() => router.push("/quiz")}
          />
        ) : (
          <QuestionView
            key={`question-${currentIndex}`}
            quiz={quiz}
            currentIndex={currentIndex}
            question={question}
            selectedAnswer={selectedAnswers[currentIndex]}
            onSelect={handleSelect}
            onNext={goNext}
            onBack={goBack}
            onSubmit={() => void submitQuiz()}
            submitting={submitting}
            allAnswered={allAnswered}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestionView({
  quiz,
  currentIndex,
  question,
  selectedAnswer,
  onSelect,
  onNext,
  onBack,
  onSubmit,
  submitting,
  allAnswered,
  error,
}: {
  quiz: QuizRow;
  currentIndex: number;
  question: QuizQuestion;
  selectedAnswer: number;
  onSelect: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  allAnswered: boolean;
  error: string | null;
}) {
  const total = quiz.questions.length;
  const isLast = currentIndex === total - 1;

  return (
    <motion.div
      key={currentIndex}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-5"
    >
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {total}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            <Brain className="h-3.5 w-3.5" />
            Quiz
          </span>
        </div>

        <ProgressBar value={currentIndex + 1} max={total} height={6} />

        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          {question.question}
        </h2>

        <div className="mt-5 flex flex-col gap-2.5">
          {question.options.map((option, i) => {
            const selected = selectedAnswer === i;
            return (
              <motion.button
                key={i}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(i)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors",
                  selected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-200/60 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700/60 dark:hover:bg-gray-800"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-medium",
                    selected
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400"
                  )}
                >
                  {selected ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-gray-800 dark:text-gray-100">{option}</span>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={currentIndex === 0}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>

        {isLast ? (
          <Button
            onClick={onSubmit}
            isLoading={submitting}
            disabled={!allAnswered}
            icon={<GraduationCap className="h-4 w-4" />}
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={selectedAnswer < 0}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Next
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Results({
  quiz,
  selectedAnswers,
  score,
  total,
  percentage,
  onBack,
}: {
  quiz: QuizRow;
  selectedAnswers: number[];
  score: number;
  total: number;
  percentage: number;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <Card className="flex flex-col items-center gap-5 p-8 text-center">
        <CircularProgress percentage={percentage} />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {score} out of {total} correct
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {percentage >= 70
              ? "Great job! You know this material well."
              : percentage >= 50
                ? "Not bad! Review the explanations below."
                : "Keep studying — review the explanations below."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
              percentage >= 70
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : percentage >= 50
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {percentage}% score
          </span>
        </div>
        <Button onClick={onBack} variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
          Back to Quizzes
        </Button>
      </Card>

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, i) => {
          const userAnswer = selectedAnswers[i];
          const correct = userAnswer === q.correctAnswer;
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
            >
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      correct
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    {correct ? <CircleCheck className="h-4 w-4" /> : <CircleX className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Question {i + 1}: {q.question}
                      </h3>
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5 text-sm">
                      {q.options.map((option, oi) => {
                        const isCorrect = oi === q.correctAnswer;
                        const isUserPick = oi === userAnswer;
                        return (
                          <div
                            key={oi}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
                              isCorrect
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : isUserPick
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 line-through"
                                  : "text-gray-600 dark:text-gray-300"
                            )}
                          >
                            <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                            <span>{option}</span>
                            {isCorrect && (
                              <span className="ml-auto text-xs font-medium">Correct answer</span>
                            )}
                            {isUserPick && !isCorrect && (
                              <span className="ml-auto text-xs font-medium">Your answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-500/5 p-3 text-sm text-gray-600 dark:text-gray-300">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p>{q.explanation}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pb-2">
        <Button onClick={onBack} size="lg" icon={<GraduationCap className="h-4 w-4" />}>
          Back to Quizzes
        </Button>
      </div>
    </motion.div>
  );
}

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 70 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative h-36 w-36">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-gray-200 dark:stroke-gray-800"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 18 }}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        >
          {percentage}%
        </motion.span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Score</span>
      </div>
    </div>
  );
}
