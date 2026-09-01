import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel } from "@/lib/gemini/client";
import { FLASHCARD_GENERATION_PROMPT } from "@/lib/gemini/prompts";

interface AIFlashcard {
  id: string;
  front: string;
  back: string;
}

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
    const { documentId, numCards } = body as {
      documentId: string;
      numCards: number;
    };

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const { data: chunks, error: chunkError } = await supabase
      .from("chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (chunkError || !chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: "No chunks found for document" },
        { status: 404 }
      );
    }

    const context = chunks.map((c) => c.content).join("\n\n");

    const prompt = `${FLASHCARD_GENERATION_PROMPT}\n\nGenerate ${numCards} flashcards based on the following content:\n\n${context}`;

    const result = await getGeminiModel().generateContent(prompt);
    const raw = result.response.text();

    let flashcards: AIFlashcard[];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      flashcards = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse flashcards from AI response" },
        { status: 500 }
      );
    }

    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        document_id: documentId,
        title: `Flashcards: ${document.title}`,
        description: `${flashcards.length} cards from ${document.title}`,
        card_count: flashcards.length,
      })
      .select()
      .single();

    if (deckError) {
      return NextResponse.json(
        { error: "Failed to save flashcard deck" },
        { status: 500 }
      );
    }

    const flashcardRecords = flashcards.map((fc) => ({
      deck_id: deck.id,
      front: fc.front,
      back: fc.back,
    }));

    const { data: savedCards, error: cardsError } = await supabase
      .from("flashcards")
      .insert(flashcardRecords)
      .select();

    if (cardsError) {
      return NextResponse.json(
        { error: "Failed to save flashcards" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...deck,
      flashcards: savedCards,
    });
  } catch (error) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
