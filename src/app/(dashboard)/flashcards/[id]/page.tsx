"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Shuffle,
  CircleCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface FlashcardRow {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

interface DeckRow {
  id: string;
  title: string;
  card_count: number;
  created_at: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function StudyFlashcardPage() {
  const params = useParams<{ id: string }>();
  const deckId = params.id;
  const router = useRouter();

  const [deck, setDeck] = useState<DeckRow | null>(null);
  const [cards, setCards] = useState<FlashcardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [reviewedAll, setReviewedAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [deckRes, cardsRes] = await Promise.all([
          supabase
            .from("flashcard_decks")
            .select("id,title,card_count,created_at")
            .eq("id", deckId)
            .single(),
          supabase
            .from("flashcards")
            .select("id,front,back,created_at")
            .eq("deck_id", deckId)
            .order("created_at", { ascending: true }),
        ]);

        if (deckRes.error) throw new Error(deckRes.error.message);
        if (cardsRes.error) throw new Error(cardsRes.error.message);

        const loadedCards = (cardsRes.data as FlashcardRow[] | null) ?? [];
        if (loadedCards.length === 0) {
          throw new Error("This deck has no flashcards");
        }

        if (cancelled) return;
        setDeck(deckRes.data as DeckRow);
        setCards(loadedCards);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load flashcards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const totalCards = cards.length;
  const currentCard = cards[currentIndex] ?? null;
  const masteredCount = knownCards.size;
  const progressValue = knownCards.size + unknownCards.size;

  const markKnown = useCallback(() => {
    if (!currentCard) return;
    setKnownCards((prev) => new Set(prev).add(currentCard.id));
    setUnknownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });

    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setReviewedAll(true);
    }
  }, [currentCard, currentIndex, totalCards]);

  const markUnknown = useCallback(() => {
    if (!currentCard) return;
    setUnknownCards((prev) => new Set(prev).add(currentCard.id));
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });

    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setReviewedAll(true);
    }
  }, [currentCard, currentIndex, totalCards]);

  const shuffleCards = useCallback(() => {
    setCards((prev) => shuffleArray(prev));
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setReviewedAll(false);
  }, []);

  const restartReview = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setReviewedAll(false);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setReviewedAll(true);
    }
  }, [currentIndex, totalCards]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const flipCard = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || error) return;
      if (reviewedAll) return;

      if (e.code === "Space") {
        e.preventDefault();
        flipCard();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, error, reviewedAll, flipCard, goNext, goPrev]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !deck) {
    return (
      <div className="mx-auto flex w-full max-w-2xl">
        <Card className="flex flex-1 flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Couldn&apos;t load this deck
          </p>
          <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <Link
            href="/flashcards"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to flashcards
          </Link>
        </Card>
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to flashcards</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
          {deck.title}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {reviewedAll ? (
          <ResultsSummary
            key="results"
            masteredCount={masteredCount}
            totalCards={totalCards}
            onRestart={restartReview}
            onBack={() => router.push("/flashcards")}
          />
        ) : currentCard ? (
          <motion.div
            key={`card-${currentIndex}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-5"
          >
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Card {currentIndex + 1} of {totalCards}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shuffleCards}
                  icon={<Shuffle className="h-3.5 w-3.5" />}
                >
                  Shuffle
                </Button>
              </div>

              <ProgressBar value={progressValue} max={totalCards} height={6} />

              <div className="mt-6" style={{ perspective: "1200px" }}>
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative cursor-pointer"
                  onClick={flipCard}
                >
                  {/* Front */}
                  <div
                    className={cn(
                      "flex min-h-[240px] flex-col items-center justify-center rounded-2xl p-8 text-center transition-colors",
                      "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900",
                      "border border-gray-200/50 dark:border-gray-700/50",
                      "shadow-sm dark:shadow-black/20",
                      isFlipped && "pointer-events-none"
                    )}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                      Question
                    </p>
                    <p className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                      {currentCard.front}
                    </p>
                    <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                      Click to reveal answer
                    </p>
                  </div>

                  {/* Back */}
                  <div
                    className={cn(
                      "absolute inset-0 flex min-h-[240px] flex-col items-center justify-center rounded-2xl p-8 text-center transition-colors",
                      "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40",
                      "border border-blue-200/50 dark:border-blue-800/50",
                      "shadow-sm dark:shadow-black/20",
                      !isFlipped && "pointer-events-none"
                    )}
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-purple-500 dark:text-purple-400">
                      Answer
                    </p>
                    <p className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                      {currentCard.back}
                    </p>
                  </div>
                </motion.div>
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
                onClick={goPrev}
                disabled={currentIndex === 0}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={goNext}
                disabled={currentIndex === totalCards - 1}
                icon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={markUnknown}
                icon={<RotateCcw className="h-4 w-4" />}
              >
                <span className="text-orange-600 dark:text-orange-400">Review Again</span>
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={markKnown}
                icon={<CircleCheck className="h-4 w-4" />}
              >
                <span>Know It</span>
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              Space to flip · ← → to navigate
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ResultsSummary({
  masteredCount,
  totalCards,
  onRestart,
  onBack,
}: {
  masteredCount: number;
  totalCards: number;
  onRestart: () => void;
  onBack: () => void;
}) {
  const percentage = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <Card className="flex flex-col items-center gap-5 p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="relative h-36 w-36"
        >
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={54}
              fill="none"
              strokeWidth="10"
              className="stroke-gray-200 dark:stroke-gray-800"
            />
            <motion.circle
              cx="64"
              cy="64"
              r={54}
              fill="none"
              stroke={
                percentage >= 70 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444"
              }
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 54 - (percentage / 100) * 2 * Math.PI * 54,
              }}
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
            <span className="text-xs text-gray-500 dark:text-gray-400">Mastered</span>
          </div>
        </motion.div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {masteredCount} out of {totalCards} mastered
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {percentage >= 70
              ? "Excellent work! You've mastered most of these flashcards."
              : percentage >= 50
                ? "Good progress! Keep reviewing the ones you missed."
                : "Keep studying — review the cards you marked for another round."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {masteredCount} known
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-600 dark:text-orange-400">
            {totalCards - masteredCount} to review
          </span>
        </div>
      </Card>

      <div className="flex justify-center gap-3">
        <Button onClick={onBack} variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
          Back to Decks
        </Button>
        <Button onClick={onRestart} icon={<RotateCcw className="h-4 w-4" />}>
          Review Again
        </Button>
      </div>
    </motion.div>
  );
}
