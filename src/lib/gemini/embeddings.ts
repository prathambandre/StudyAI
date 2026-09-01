import { geminiKey } from "@/lib/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function getEmbeddingModel() {
  return getGenAI().getGenerativeModel({ model: "gemini-embedding-001" });
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRateLimit =
        err instanceof Error && /429|Too Many Requests|RESOURCE_EXHAUSTED/i.test(err.message);
      if (isRateLimit && i < attempts - 1) {
        await sleep(Math.min(60_000, 15_000 * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await withRetry(() =>
    getEmbeddingModel().embedContent(text)
  );
  return result.embedding.values;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  const results: number[][] = new Array(texts.length);

  // batchEmbedContents sends one request per up-to-100 texts instead of N
  // sequential requests, which avoids hitting per-minute rate limits.
  const BATCH_SIZE = 100;

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const result = await withRetry(() =>
      model.batchEmbedContents({
        requests: batch.map((text) => ({
          content: { role: "user", parts: [{ text }] },
        })),
      })
    );
    for (let i = 0; i < batch.length; i++) {
      results[start + i] = result.embeddings[i].values;
    }
  }

  return results;
}