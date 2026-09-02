import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      { count: totalDocuments },
      { count: totalQuizzes },
      { data: quizAttempts },
      { data: flashcardDecks },
      { data: recentDocuments },
      { data: recentQuizAttempts },
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("quizzes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("quiz_attempts")
        .select("score, total_questions")
        .eq("user_id", user.id),
      supabase
        .from("flashcard_decks")
        .select("card_count")
        .eq("user_id", user.id),
      supabase
        .from("documents")
        .select("title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("quiz_attempts")
        .select("score, total_questions, completed_at, quizzes(title)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10),
    ]);

    const averageScore =
      quizAttempts && quizAttempts.length > 0
        ? quizAttempts.reduce(
            (sum, a) => sum + (a.score / a.total_questions) * 100,
            0
          ) / quizAttempts.length
        : 0;

    const recentActivity: {
      type: "document" | "quiz";
      title: string;
      date: string;
    }[] = [];

    if (recentDocuments) {
      recentDocuments.forEach((d) =>
        recentActivity.push({
          type: "document",
          title: d.title,
          date: d.created_at,
        })
      );
    }

    if (recentQuizAttempts) {
      recentQuizAttempts.forEach((a) => {
        const q = a.quizzes as { title?: string } | null;
        recentActivity.push({
          type: "quiz",
          title: q?.title ?? "Quiz",
          date: a.completed_at as string,
        });
      });
    }

    recentActivity.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const quizScoresOverTime =
      recentQuizAttempts?.map((a) => ({
        date: a.completed_at,
        score: Math.round((a.score / a.total_questions) * 100),
      })) ?? [];

    const totalFlashcardCount = Array.isArray(flashcardDecks)
      ? flashcardDecks.reduce(
          (sum: number, d: { card_count?: number | null }) =>
            sum + (d.card_count ?? 0),
          0
        )
      : 0;

    return NextResponse.json({
      totalDocuments: totalDocuments ?? 0,
      totalQuizzes: totalQuizzes ?? 0,
      averageScore: Math.round(averageScore),
      totalFlashcards: totalFlashcardCount,
      recentActivity: recentActivity.slice(0, 10),
      quizScoresOverTime,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
