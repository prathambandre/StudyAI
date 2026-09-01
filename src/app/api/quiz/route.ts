import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel } from "@/lib/gemini/client";
import { QUIZ_GENERATION_PROMPT } from "@/lib/gemini/prompts";
import type { QuizQuestion } from "@/types";

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
    const { documentId, numQuestions, questionType } = body as {
      documentId: string;
      numQuestions: number;
      questionType: string;
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

    const prompt = `${QUIZ_GENERATION_PROMPT}\n\nGenerate ${numQuestions} ${questionType} questions based on the following content:\n\n${context}`;

    const result = await getGeminiModel().generateContent(prompt);
    const raw = result.response.text();

    let questions: QuizQuestion[];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse quiz questions from AI response" },
        { status: 500 }
      );
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        user_id: user.id,
        document_id: documentId,
        title: `Quiz: ${document.title}`,
        description: `${numQuestions} ${questionType} questions based on ${document.title}`,
        questions,
      })
      .select()
      .single();

    if (quizError) {
      return NextResponse.json(
        { error: "Failed to save quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
