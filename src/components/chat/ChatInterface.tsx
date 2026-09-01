"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, ChevronDown, LoaderCircle, CircleCheck } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

interface ChatSource {
  content: string;
  pageNumber: number;
  score: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[] | null;
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId: string;
  documentId?: string;
  initialPrompt?: string | null;
}

export default function ChatInterface({
  conversationId,
  documentId,
  initialPrompt,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const sentInitial = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: loadError } = await supabase
          .from("messages")
          .select("id,role,content,sources,created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (loadError) throw new Error(loadError.message);
        if (cancelled) return;
        setMessages((data as ChatMessage[] | null) ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending, error]);

  // A quick prompt picked on the start-Chat form becomes the first message:
  // send it automatically once the (empty) conversation has loaded.
  const handleSend = useCallback(
    async (contentOverride?: string) => {
      const content = (contentOverride ?? input).trim();
      if (!content || sending) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const tempUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId,
          documentId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data?.response || data?.reply || data?.content || "",
          sources: data?.sources ?? null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, documentId]);

  // A quick prompt picked on the start-Chat form becomes the first message:
  // send it automatically once the (empty) conversation has loaded.
  useEffect(() => {
    if (!initialPrompt || sentInitial.current || sending) return;
    if (loading || messages.length > 0) return;
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : ((cb: () => void) => setTimeout(cb, 16));
    raf(() => {
      sentInitial.current = true;
      void handleSend(initialPrompt);
    });
  }, [initialPrompt, messages.length, loading, sending, handleSend]);

  const toggleSource = useCallback((messageId: string) => {
    setExpandedSources((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  }, []);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 4 * 24)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Start the conversation by asking a question about your document below.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  expanded={!!expandedSources[message.id]}
                  onToggleSources={() => toggleSource(message.id)}
                />
              ))}
            </AnimatePresence>

            {sending && <TypingIndicator />}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200/60 dark:border-gray-700/40 bg-white/40 dark:bg-gray-950/40 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask a question about your document..."
            className="max-h-[96px] flex-1 resize-none rounded-xl border border-gray-200/60 bg-white/80 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700/60 dark:bg-gray-900/80 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <Button
            size="md"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            icon={<Send className="h-4 w-4" />}
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  expanded,
  onToggleSources,
}: {
  message: ChatMessage;
  expanded: boolean;
  onToggleSources: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn("flex max-w-[80%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "rounded-br-sm bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20"
              : "rounded-bl-sm bg-white/90 text-gray-800 shadow-sm dark:bg-gray-800/90 dark:text-gray-100"
          )}
        >
          {message.content}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 w-full">
            <button
              onClick={onToggleSources}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              {message.sources.length} source{message.sources.length === 1 ? "" : "s"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
              />
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-col gap-2">
                    {message.sources.map((source, i) => (
                      <div
                        key={`${message.id}-source-${i}`}
                        className="rounded-xl border border-gray-200/60 bg-white/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/80"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Page {source.pageNumber}
                          {typeof source.score === "number" && (
                            <span className="text-gray-400">
                              · {Math.round(source.score * 100)}% match
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                          {source.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <span className="mt-1 px-1 text-[10px] text-gray-400 dark:text-gray-500">
          {formatRelativeDate(message.created_at)}
        </span>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="flex items-end gap-3"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white/90 px-4 py-3 shadow-sm dark:bg-gray-800/90">
        <motion.span
          className="h-2 w-2 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: 0 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: 0.15 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
