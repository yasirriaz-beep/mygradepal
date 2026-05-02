-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text,
  questions_count integer,
  score_marks integer,
  total_marks integer,
  score_percent numeric,
  grade text,
  time_taken_seconds integer,
  weak_topics text[],
  mode text DEFAULT 'practice',
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own results" ON exam_results;
DROP POLICY IF EXISTS "exam_results_select" ON exam_results;
DROP POLICY IF EXISTS "exam_results_insert" ON exam_results;
DROP POLICY IF EXISTS "exam_results_update" ON exam_results;
DROP POLICY IF EXISTS "exam_results_delete" ON exam_results;

CREATE POLICY "exam_results_select" ON exam_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exam_results_insert" ON exam_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_results_update" ON exam_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "exam_results_delete" ON exam_results FOR DELETE USING (auth.uid() = user_id);
