export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: "processing" | "ready" | "error";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  embedding?: number[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  createdAt: string;
}

export interface Quiz {
  id: string;
  userId: string;
  documentId?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  documentId?: string;
  title: string;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}

export interface SourceChunk {
  content: string;
  pageNumber: number;
  score: number;
}

export interface DashboardStats {
  totalDocuments: number;
  totalQuizzes: number;
  averageScore: number;
  totalFlashcards: number;
  recentActivity: {
    type: "document" | "quiz" | "flashcard" | "chat";
    title: string;
    date: string;
  }[];
}
