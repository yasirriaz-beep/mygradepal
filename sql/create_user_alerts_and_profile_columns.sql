CREATE TABLE IF NOT EXISTS user_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text,
  message text,
  sent_at timestamptz DEFAULT now(),
  delivery_method text,
  delivered boolean DEFAULT false
);

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS parent_email text;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS student_name text;
