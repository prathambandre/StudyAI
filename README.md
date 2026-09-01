# StudyAI — RAG-Powered Learning Platform

An AI-powered learning application built with an **Apple Design Language**. Upload PDFs, chat with your documents (RAG), generate smart quizzes, study with flashcards, and track your performance — all with a beautiful, animated, light/dark theme interface.

![Stack](https://img.shields.io/badge/Next.js%2016-Turbopack-black) ![TypeScript](https://img.shields.io/badge/TypeScript-blue) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E) ![Gemini](https://img.shields.io/badge/Gemini-4285F4) ![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC)

---

## ✨ Features

### 📄 PDF Upload & Processing
- Drag-and-drop upload with animated progress
- Automatic text extraction, chunking, and embedding generation
- Instant index for semantic search

### 💬 RAG Chat (Ask your PDFs)
- Ask natural-language questions about any uploaded document
- Answers come with **source citations** (page number + snippet + match score)
- Chat history is saved per conversation

### 🧠 Smart Quizzes
- Generate quizzes from any PDF (5–20 questions)
- Multiple choice / True-False / Mixed question types
- Track scores per attempt with animations
- Instant grading with explanations

### 🃏 Flashcards
- Auto-generate decks from PDF content
- 3D flip-card study mode
- Mark "Know it" / "Review again", shuffle, and track progress

### 📊 Performance Dashboard
- Overview stats: documents, quizzes taken, average score, flashcards
- **Analytics page** with charts (score over time, activity, uploads per week)
- Recent activity feed

### 🔐 Authentication
- Full sign-up / log-in with Supabase Auth
- Hashed passwords, session management, row-level security
- Protected routes via middleware

### 🎨 Apple Design Language
- Clean glassmorphism UI, SF-style system typography, rounded corners
- **Light & Dark mode** toggle (persists preference)
- **Animated mouse cursor follower**, page transitions, hover effects, staggered entrances

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI/Animation | Framer Motion, lucide-react, recharts |
| Database & Auth | Supabase (PostgreSQL + Auth + RLS) |
| LLM / Embeddings | Google Gemini (`gemini-1.5-flash`, `gemini-embedding-001`) |
| PDF Parsing | pdfjs-dist (legacy build) |
| Vector Search | In-memory cosine similarity with file persistence |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** 18.18+ (Node 20+ recommended)
- A **Supabase** project (free tier is fine)
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Copy `.env.local` and fill in your real keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> The app ships with safe placeholders so `npm run build` works before you add keys. Once you set real values, everything activates automatically.

### 4. Set up the database (Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the project dashboard, open **SQL Editor** → **New query**.
3. Copy the entire contents of `supabase/schema.sql` and run it.
4. This creates all tables, indexes, row-level security policies, and the auto-profile trigger.

### 5. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

```
rag-app/
├── src/
│   ├── app/
│   │   ├── (auth)/                # Login & Signup (split-screen Apple layout)
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/           # Protected app pages
│   │   │   ├── page.tsx           # Dashboard home (stats + activity)
│   │   │   ├── upload/page.tsx    # PDF upload
│   │   │   ├── chat/              # Chat list + conversation
│   │   │   ├── chat/[id]/page.tsx
│   │   │   ├── quiz/              # Quiz list + take quiz
│   │   │   ├── quiz/[id]/page.tsx
│   │   │   ├── flashcards/        # Decks + study mode
│   │   │   ├── analytics/page.tsx # Charts & performance
│   │   ├── api/                   # Backend API routes
│   │   │   ├── upload/route.ts    # PDF upload + embed
│   │   │   ├── chat/route.ts      # RAG Q&A
│   │   │   ├── quiz/route.ts      # Quiz generation
│   │   │   ├── flashcards/route.ts# Flashcard generation
│   │   │   └── analytics/route.ts # Aggregated stats
│   │   ├── page.tsx               # Public landing page
│   │   ├── layout.tsx
│   │   └── globals.css            # Apple design tokens & animations
│   ├── components/
│   │   ├── ui/                    # Reusable UI (Button, Card, Modal, Toast…)
│   │   ├── layout/                # Sidebar, Header, DashboardLayout, MouseFollower
│   │   ├── chat/ChatInterface.tsx
│   │   └── flashcard/FlashcardDeck.tsx
│   ├── context/                   # Theme, Auth providers
│   ├── hooks/                     # useMousePosition, useDebounce
│   ├── lib/
│   │   ├── supabase/              # Client/server/middleware
│   │   ├── gemini/                # LLM client, embeddings, prompts
│   │   ├── config.ts              # Env config + safe fallbacks
│   │   ├── vector-store.ts        # In-memory cosine similarity search
│   │   ├── pdf-parser.ts          # pdfjs parsing + chunking
│   │   └── utils.ts
│   ├── types/index.ts
│   └── proxy.ts                   # Auth route protection
├── supabase/schema.sql            # Run this in Supabase SQL Editor
└── package.json
```

---

## 🔑 How to get the keys you need

**Supabase**
1. Sign up at [supabase.com](https://supabase.com) → **New project**.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

**Google Gemini**
1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. **Get API key** → create a key.
3. Paste it as `GEMINI_API_KEY`.

---

## 🧠 How RAG works in this app

1. **Upload**: Your PDF is parsed page-by-page (pdfjs), split into overlapping text chunks.
2. **Embed**: Each chunk is converted into a vector with `gemini-embedding-001`.
3. **Store**: Chunks go into Supabase; embeddings into the local vector store (with file persistence in `data/`).
4. **Ask**: Your question is embedded and compared against stored vectors using **cosine similarity** to find the most relevant chunks.
5. **Answer**: Gemini (`gemini-1.5-flash`) reads the retrieved context + your question, and returns an answer with source citations.

---

## 🧪 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build (type-checked) |
| `npm run start` | Start production server |
| `npm run lint` | Lint all files |

---

## 🌗 Theming

This app uses an **Apple-style** design system with:
- **System font stack** (SF Pro / Segoe UI on Windows)
- **Glassmorphism** panels with `backdrop-blur`
- Design tokens for Apple's palette (blue `#007AFF`, green `#34C759`, etc.)
- Automatic **light/dark** mode with a persistent toggle and system-preference detection

---

## 🌐 Deployment

Deploy on **Vercel**:
1. Push this repo to GitHub.
2. Import into [Vercel](https://vercel.com).
3. Add your environment variables (from `.env.local`) in the project settings.
4. Deploy. Supabase handles the database + auth in the cloud.

---

Built with ♥ — an Apple-grade RAG learning experience.
