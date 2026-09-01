-- Migration: add columns used by the app but missing from the original schema.
-- Safe to re-run (idempotent). Paste into Supabase SQL Editor and run.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sources JSONB;

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS card_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep conversation.updated_at in sync whenever a new message is added.
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- Backfill flashcard_decks.card_count from existing flashcards.
UPDATE public.flashcard_decks d
SET card_count = (
  SELECT count(*) FROM public.flashcards f WHERE f.deck_id = d.id
);