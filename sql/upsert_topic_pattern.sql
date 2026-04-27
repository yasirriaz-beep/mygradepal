-- Run in Supabase SQL Editor (Task 4).
-- Requires UNIQUE (subject, topic) on topic_patterns for ON CONFLICT.

CREATE OR REPLACE FUNCTION upsert_topic_pattern(
  p_subject text,
  p_topic   text,
  p_year    int,
  p_count   int
)
RETURNS void AS $$
BEGIN
  INSERT INTO topic_patterns (subject, topic, years_appeared, frequency_score, last_appeared, prediction_tier, grade_level)
  VALUES (
    p_subject,
    p_topic,
    ARRAY[p_year],
    50,
    p_year,
    'possible',
    'IGCSE'
  )
  ON CONFLICT (subject, topic) DO UPDATE SET
    years_appeared = array_append(
      array_remove(topic_patterns.years_appeared, p_year),
      p_year
    ),
    last_appeared  = GREATEST(topic_patterns.last_appeared, p_year),
    frequency_score = LEAST(100, ROUND(
      array_length(
        array_append(array_remove(topic_patterns.years_appeared, p_year), p_year),
        1
      ) / 15.0 * 100
    )),
    prediction_tier = CASE
      WHEN frequency_score >= 90 THEN 'certain'
      WHEN frequency_score >= 70 THEN 'likely'
      ELSE 'possible'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
