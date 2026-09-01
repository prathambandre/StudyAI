"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Plus,
  MessageSquare,
  FileText,
  Sparkles,
  ChevronDown,
  Search,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/context/AuthContext";
import { formatRelativeDate, truncateText, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

interface ConversationRow {
  id: string;
  title: string;
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
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const quickPrompts = [
  "Summarize this document",
  "What are the main key points?",
  "Explain the most important concepts",
  "Quiz me on this content",
];

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [prompt, setPrompt] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [convRes, docRes] = await Promise.all([
          supabase
            .from("conversations")
            .select("id,title,document_id,created_at,updated_at")
            .order("updated_at", { ascending: false }),
          supabase
            .from("documents")
            .select("id,title")
            .order("created_at", { ascending: false }),
        ]);

        if (convRes.error) throw new Error(convRes.error.message);
        if (docRes.error) throw new Error(docRes.error.message);

        if (cancelled) return;
        setConversations((convRes.data as ConversationRow[] | null) ?? []);
        setDocuments((docRes.data as DocumentRow[] | null) ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load conversations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const startNewChat = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const title = prompt.trim() || "New conversation";
      const { data, error: insertError } = await supabase
        .from("conversations")
        .insert({
          user_id: user?.id,
          title: title.slice(0, 120),
          document_id: selectedDocument || null,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      const conversation = data as ConversationRow;
      setConversations((prev) => [conversation, ...prev]);
      setSelectedId(conversation.id);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create conversation");
    } finally {
      setCreating(false);
    }
  }, [creating, prompt, selectedDocument, user]);

  const filteredConversations = query.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : conversations;

  const documentTitleMap = useMemo(
    () => Object.fromEntries(documents.map((d) => [d.id, d.title])),
    [documents]
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex h-full gap-4"
    >
      {/* Left panel: conversation list */}
      <motion.div variants={item} className="flex w-full flex-col md:w-[320px] md:shrink-0">
        <Card className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 p-4 dark:border-gray-700/40">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chats</h2>
            <Button
              size="sm"
              onClick={() => {
                setSelectedId(null);
                setPrompt("");
              }}
              icon={<Plus className="h-3.5 w-3.5" />}
              isLoading={creating}
            >
              New Chat
            </Button>
          </div>

          <div className="border-b border-gray-200/60 p-3 dark:border-gray-700/40">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-xl border border-gray-200/60 bg-white/60 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700/60 dark:bg-gray-900/60 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                hasQuery={!!query.trim()}
                onCreate={startNewChat}
                creating={creating}
              />
            ) : (
              <motion.ul variants={container} initial="hidden" animate="show" className="p-2">
                {filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedId;
                  return (
                    <motion.li key={conversation.id} variants={item}>
                      <button
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            setSelectedId(conversation.id);
                          } else {
                            router.push(`/chat/${conversation.id}`);
                          }
                        }}
                        className={cn(
                          "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-blue-500/10"
                            : "hover:bg-gray-100/60 dark:hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                              active
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            )}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {truncateText(conversation.title, 40)}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              {conversation.document_id &&
                              documentTitleMap[conversation.document_id] ? (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <FileText className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {truncateText(
                                      documentTitleMap[conversation.document_id],
                                      18
                                    )}
                                  </span>
                                </span>
                              ) : (
                                <span>General</span>
                              )}
                              <span>·</span>
                              <span className="shrink-0">
                                {formatRelativeDate(conversation.updated_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Right panel: chat area */}
      <motion.div variants={item} className="hidden flex-1 md:block">
        <Card className="flex h-full flex-col overflow-hidden">
          {selectedConversation ? (
            <ChatInterface
              conversationId={selectedConversation.id}
              documentId={selectedConversation.document_id ?? undefined}
            />
          ) : (
            <WelcomePanel
              documents={documents}
              selectedDocument={selectedDocument}
              onSelectDocument={setSelectedDocument}
              onStart={startNewChat}
              creating={creating}
              onPickPrompt={setPrompt}
              error={error}
            />
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

function EmptyState({
  hasQuery,
  onCreate,
  creating,
}: {
  hasQuery: boolean;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
        <MessageSquare className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {hasQuery ? "No chats found" : "No conversations yet"}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {hasQuery
            ? "Try a different search term."
            : "Start a new chat to get going."}
        </p>
      </div>
      {!hasQuery && (
        <Button size="sm" onClick={onCreate} isLoading={creating} icon={<Plus className="h-3.5 w-3.5" />}>
          New Chat
        </Button>
      )}
    </div>
  );
}

function WelcomePanel({
  documents,
  selectedDocument,
  onSelectDocument,
  onStart,
  creating,
  onPickPrompt,
  error,
}: {
  documents: DocumentRow[];
  selectedDocument: string;
  onSelectDocument: (id: string) => void;
  onStart: () => void;
  creating: boolean;
  onPickPrompt: (value: string) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25"
        >
          <MessageSquare className="h-8 w-8" />
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Chat with your documents
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Pick a document, then ask questions and get answers grounded in your content.
          </p>
        </div>

        {error && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="w-full">
          <label className="mb-1.5 block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
            Document
          </label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={selectedDocument}
              onChange={(e) => onSelectDocument(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200/60 bg-white/80 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700/60 dark:bg-gray-900/80 dark:text-gray-100"
            >
              <option value="">No document (general chat)</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="w-full">
          <p className="mb-1.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
            Or start with a quick prompt
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => onPickPrompt(p)}
                className="flex items-center gap-2 rounded-xl border border-gray-200/60 bg-white/60 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700/60 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-blue-950/40"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span>{p}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          isLoading={creating}
          icon={<Plus className="h-4 w-4" />}
          className="w-full"
        >
          Start Chat
        </Button>
      </div>
    </div>
  );
}
