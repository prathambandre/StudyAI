import fs from "fs";
import path from "path";

interface VectorEntry {
  embedding: number[];
  metadata: {
    chunkId: string;
    documentId: string;
    content: string;
    pageNumber: number;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const VECTOR_FILE = path.join(DATA_DIR, "vectors.json");

let store: Map<string, VectorEntry> = new Map();

function loadFromDisk(): void {
  try {
    if (fs.existsSync(VECTOR_FILE)) {
      const raw = fs.readFileSync(VECTOR_FILE, "utf-8");
      const parsed: Record<string, VectorEntry> = JSON.parse(raw);
      store = new Map(Object.entries(parsed));
    }
  } catch {
    store = new Map();
  }
}

function saveToDisk(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const obj = Object.fromEntries(store);
  fs.writeFileSync(VECTOR_FILE, JSON.stringify(obj, null, 2));
}

loadFromDisk();

export function addEmbedding(
  id: string,
  embedding: number[],
  metadata: VectorEntry["metadata"]
): void {
  store.set(id, { embedding, metadata });
  saveToDisk();
}

export function removeEmbeddings(ids: string[]): void {
  for (const id of ids) {
    store.delete(id);
  }
  saveToDisk();
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface SearchResult {
  id: string;
  score: number;
  metadata: VectorEntry["metadata"];
}

export function similaritySearch(
  queryEmbedding: number[],
  topK: number = 5
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const [id, entry] of store) {
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    results.push({ id, score, metadata: entry.metadata });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
