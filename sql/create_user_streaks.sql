CREATE TABLE IF NOT EXISTS user_streaks (
  user_id uuid REFERENCES auth.users(id) PRIMARY KEY,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_active_date date,
  updated_at timestamptz DEFAULT now()
);
