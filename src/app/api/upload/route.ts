import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPDF, chunkPages } from "@/lib/pdf-parser";
import { generateEmbeddings } from "@/lib/gemini/embeddings";
import { addEmbedding } from "@/lib/vector-store";
import fs from "fs";
import path from "path";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const { pages, pageCount } = await extractTextFromPDF(buffer);
    const chunks = chunkPages(pages);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        title,
        file_name: file.name,
        file_path: `/uploads/${fileName}`,
        file_size: file.size,
        page_count: pageCount,
        status: "processing",
      })
      .select()
      .single();

    if (docError) {
      console.error("Upload: failed to create document:", docError);
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    const chunkRecords: {
      document_id: string;
      content: string;
      page_number: number;
      chunk_index: number;
    }[] = chunks.map((chunk, i) => ({
      document_id: document.id,
      content: chunk.content,
      page_number: chunk.pageNumber,
      chunk_index: i,
    }));

    const { data: insertedChunks, error: chunkError } = await supabase
      .from("chunks")
      .insert(chunkRecords)
      .select();

    if (chunkError) {
      await cleanupFailedUpload(supabase, document.id, filePath);
      return NextResponse.json(
        { error: "Failed to store chunks. Please try again." },
        { status: 500 }
      );
    }

    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(chunks.map((c) => c.content));
    } catch (e) {
      console.error("Upload: embedding failed:", e);
      await cleanupFailedUpload(supabase, document.id, filePath);
      return NextResponse.json(
        {
          error:
            "Upload paused: the AI embedding quota is temporarily exhausted. Please wait a minute and try again.",
        },
        { status: 503 }
      );
    }

    for (let i = 0; i < insertedChunks.length; i++) {
      addEmbedding(insertedChunks[i].id, embeddings[i], {
        chunkId: insertedChunks[i].id,
        documentId: document.id,
        content: chunks[i].content,
        pageNumber: chunks[i].pageNumber,
      });
    }

    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", document.id);

    return NextResponse.json({
      documentId: document.id,
      stats: {
        pageCount,
        chunkCount: chunks.length,
        fileSize: file.size,
        title,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function cleanupFailedUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  filePath: string
) {
  await supabase.from("chunks").delete().eq("document_id", documentId);
  await supabase.from("documents").delete().eq("id", documentId);
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Non-fatal: leftover file in public/uploads is git-ignored.
  }
}
