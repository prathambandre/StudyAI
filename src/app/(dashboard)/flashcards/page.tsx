"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Plus,
  BookOpen,
  Clock,
  FileText,
  ChevronDown,
  AlertTriangle,
  Trash2,
  Layers,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { formatDate, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface FlashcardDeckRow {
  id: string;
  title: string;
  description?: string | null;
  card_count: number;
  document_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentRow {
  id: string;
  title: string;
}

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

const cardCounts = [10, 20, 30];

async function fetchFlashcardData() {
  const [decksRes, docRes] = await Promise.all([
    supabase
      .from("flashcard_decks")
      .select("id,title,description,card_count,document_id,created_at,updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id,title")
      .order("created_at", { ascending: false }),
  ]);

  if (decksRes.error) throw new Error(decksRes.error.message);
  if (docRes.error) throw new Error(docRes.error.message);

  return {
    decks: (decksRes.data as FlashcardDeckRow[] | null) ?? [],
    documents: (docRes.data as DocumentRow[] | null) ?? [],
  };
}

export default function FlashcardsPage() {
  const router = useRouter();

  const [decks, setDecks] = useState<FlashcardDeckRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [cardCount, setCardCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FlashcardDeckRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchFlashcardData();
        if (!cancelled) {
          setDecks(data.decks);
          setDocuments(data.documents);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load flashcard decks");
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

  const generateDeck = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocument,
          cardCount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Generation failed (${res.status})`);
      }

      const deckId = data?.deckId ?? data?.id ?? data?.deck?.id;

      setModalOpen(false);
      try {
        const refreshed = await fetchFlashcardData();
        setDecks(refreshed.decks);
        setDocuments(refreshed.documents);
      } catch {
        // Non-fatal
      }

      if (deckId) {
        router.push(`/flashcards/${deckId}`);
      }
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "Failed to generate flashcards. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedDocument, cardCount, router]);

  const deleteDeck = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: delError } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", deleteTarget.id);

      if (delError) throw new Error(delError.message);

      setDecks((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete deck");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

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
            Flashcards
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Study with flashcard decks generated from your documents.
          </p>
        </div>
        <Button
          onClick={() => {
            setGenerateError(null);
            setModalOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
        >
          Generate New Deck
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
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <EmptyFlashcardState
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
          {decks.map((deck) => {
            const docTitle = deck.document_id
              ? documentTitleMap[deck.document_id] ?? null
              : null;

            return (
              <motion.div key={deck.id} variants={item}>
                <Card hover className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Layers className="h-5 w-5" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget(deck);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/50"
                      aria-label="Delete deck"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                    {deck.title}
                  </h2>

                  {deck.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {deck.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {deck.card_count} cards
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(deck.updated_at)}
                    </span>
                    {docTitle && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{docTitle}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex-1" />
                  <Link href={`/flashcards/${deck.id}`} className="mt-4">
                    <Button variant="primary" className="w-full" icon={<BookOpen className="h-4 w-4" />}>
                      Study
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Generate deck modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!generating) setModalOpen(false);
        }}
        title="Generate New Deck"
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
                {documents.length === 0 && (
                  <option value="">No documents available</option>
                )}
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
                Upload a document first to generate flashcards.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of cards
            </label>
            <div className="grid grid-cols-3 gap-2">
              {cardCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCardCount(count)}
                  className={cn(
                    "rounded-xl border py-2 text-sm font-medium transition-colors",
                    cardCount === count
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-gray-200/60 text-gray-700 hover:bg-gray-100 dark:border-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => void generateDeck()}
            isLoading={generating}
            disabled={documents.length === 0 && !selectedDocument}
            icon={<Layers className="h-4 w-4" />}
          >
            Generate
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete Deck"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This will
            remove all {deleteTarget?.card_count} flashcards in this deck.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void deleteDeck()}
              isLoading={deleting}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

function EmptyFlashcardState({
  onGenerate,
  hasDocuments,
}: {
  onGenerate: () => void;
  hasDocuments: boolean;
}) {
  return (
    <motion.div variants={item}>
      <Card className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <Layers className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No flashcard decks yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Generate a flashcard deck from one of your documents to start studying.
          </p>
        </div>
        {!hasDocuments && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            You&apos;ll need to upload a document before generating flashcards.
          </p>
        )}
        <Button
          onClick={onGenerate}
          className="mt-2"
          icon={<Plus className="h-4 w-4" />}
          disabled={!hasDocuments}
        >
          Generate New Deck
        </Button>
      </Card>
    </motion.div>
  );
}
