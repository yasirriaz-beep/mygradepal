-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS flashcard_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  UNIQUE (user_id, flashcard_id)
);

ALTER TABLE flashcard_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saves" ON flashcard_saves;
DROP POLICY IF EXISTS "flashcard_saves_select" ON flashcard_saves;
DROP POLICY IF EXISTS "flashcard_saves_insert" ON flashcard_saves;
DROP POLICY IF EXISTS "flashcard_saves_delete" ON flashcard_saves;

CREATE POLICY "flashcard_saves_select" ON flashcard_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "flashcard_saves_insert" ON flashcard_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcard_saves_delete" ON flashcard_saves FOR DELETE USING (auth.uid() = user_id);

-- Ensure spaced repetition timestamp exists on progress (legacy may use student_id)
ALTER TABLE flashcard_progress
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz DEFAULT now();
