import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel } from "@/lib/gemini/client";
import { generateEmbedding } from "@/lib/gemini/embeddings";
import { RAG_SYSTEM_PROMPT } from "@/lib/gemini/prompts";
import { similaritySearch } from "@/lib/vector-store";
import type { SourceChunk } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId, documentId } = body as {
      message: string;
      conversationId?: string;
      documentId?: string;
    };

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      });
    }

    let context = "";
    let sources: SourceChunk[] = [];

    if (documentId) {
      const queryEmbedding = await generateEmbedding(message);
      const results = similaritySearch(queryEmbedding, 5);

      const docResults = results.filter(
        (r) => r.metadata.documentId === documentId
      );

      if (docResults.length > 0) {
        context = docResults
          .map(
            (r, i) =>
              `[Source ${i + 1}] (Page ${r.metadata.pageNumber}):\n${r.metadata.content}`
          )
          .join("\n\n");

        sources = docResults.map((r) => ({
          content: r.metadata.content,
          pageNumber: r.metadata.pageNumber,
          score: r.score,
        }));
      }
    }

    const prompt = context
      ? `${RAG_SYSTEM_PROMPT}\n\nContext:\n${context}\n\nUser Question: ${message}`
      : `${RAG_SYSTEM_PROMPT}\n\nUser Question: ${message}`;

    const result = await getGeminiModel().generateContent(prompt);
    const response = result.response.text();

    let savedSources: SourceChunk[] | undefined;

    if (conversationId) {
      const { data: msgData } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: response,
          sources: sources.length > 0 ? sources : null,
        })
        .select("sources")
        .single();

      savedSources = msgData?.sources ?? undefined;
    }

    return NextResponse.json({
      response,
      sources: savedSources ?? sources,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
