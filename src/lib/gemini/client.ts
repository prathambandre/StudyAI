import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiKey } from "@/lib/config";

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

export function getGeminiModel() {
  return getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });
}
