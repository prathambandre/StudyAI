"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, FileText, LoaderCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import ChatInterface from "@/components/chat/ChatInterface";
import { truncateText } from "@/lib/utils";
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

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: convError } = await supabase
          .from("conversations")
          .select("id,title,document_id,created_at,updated_at")
          .eq("id", conversationId)
          .single();

        if (convError) throw new Error(convError.message);

        const conv = data as ConversationRow;
        if (cancelled) return;
        setConversation(conv);

        if (conv.document_id) {
          const { data: doc, error: docError } = await supabase
            .from("documents")
            .select("title")
            .eq("id", conv.document_id)
            .single();

          if (!docError && doc) {
            if (cancelled) return;
            setDocumentTitle((doc as DocumentRow).title);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load conversation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full flex-col gap-4"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to chats</span>
        </Link>
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48" />
            </div>
          ) : (
            <div>
              <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {conversation ? truncateText(conversation.title, 60) : "Conversation"}
              </h1>
              {documentTitle && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <FileText className="h-3.5 w-3.5" />
                  {truncateText(documentTitle, 40)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading / error / chat */}
      {loading ? (
        <Card className="flex flex-1 flex-col items-center justify-center gap-4">
          <LoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversation...</p>
        </Card>
      ) : error ? (
        <Card className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <MessageSquare className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Couldn&apos;t load this conversation
          </p>
          <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <Link
            href="/chat"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to chats
          </Link>
        </Card>
      ) : (
        <Card className="flex flex-1 flex-col overflow-hidden">
          <ChatInterface
            conversationId={conversationId}
            documentId={conversation?.document_id ?? undefined}
          />
        </Card>
      )}
    </motion.div>
  );
}
