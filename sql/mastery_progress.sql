-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS mastery_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  topic text,
  subtopic text,
  score_percent numeric,
  mastered boolean DEFAULT false,
  attempts integer DEFAULT 1,
  last_attempt_at timestamptz DEFAULT now(),
  UNIQUE (user_id, subject, subtopic)
);

ALTER TABLE mastery_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own mastery" ON mastery_progress;
DROP POLICY IF EXISTS "mastery_progress_select" ON mastery_progress;
DROP POLICY IF EXISTS "mastery_progress_insert" ON mastery_progress;
DROP POLICY IF EXISTS "mastery_progress_update" ON mastery_progress;
DROP POLICY IF EXISTS "mastery_progress_delete" ON mastery_progress;

CREATE POLICY "mastery_progress_select" ON mastery_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mastery_progress_insert" ON mastery_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mastery_progress_update" ON mastery_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mastery_progress_delete" ON mastery_progress FOR DELETE USING (auth.uid() = user_id);
