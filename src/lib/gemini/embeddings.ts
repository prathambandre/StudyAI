import { geminiKey } from "@/lib/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!geminiKey) {
      throw new Error(
        "Gemini API key is not configured. Set GEMINI_API_KEY in your .env.local file."
      );
    }
    genAI = new GoogleGenerativeAI(geminiKey);
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-embedding-001",
  });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map((text) => generateEmbedding(text))
  );
  return results;
}
