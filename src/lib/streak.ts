import { getSupabaseServiceClient } from "@/lib/supabase";

type StreakRow = {
  user_id: string;
  current_streak: number | null;
  longest_streak: number | null;
  last_active_date: string | null;
};

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getYesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toIsoDate(d);
}

async function ensureUserStreaksTable(): Promise<void> {
  const supabase = getSupabaseServiceClient();
  await supabase.rpc("exec_sql", {
    sql_query: `
      create table if not exists public.user_streaks (
        user_id uuid references auth.users(id) primary key,
        current_streak integer default 0,
        longest_streak integer default 0,
        last_active_date date,
        updated_at timestamptz default now()
      );
    `,
  });
}

export async function updateStreak(userId: string): Promise<number> {
  if (!userId) return 0;
  const supabase = getSupabaseServiceClient();
  const today = toIsoDate(new Date());
  const yesterday = getYesterdayIso();

  try {
    await ensureUserStreaksTable();
  } catch {
    // Non-fatal in environments where exec_sql RPC is unavailable.
  }

  const { data, error } = await supabase
    .from("user_streaks")
    .select("user_id, current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load streak: ${error.message}`);
  }

  const row = data as StreakRow | null;
  if (!row) {
    const { error: insertError } = await supabase.from("user_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      throw new Error(`Failed to create streak: ${insertError.message}`);
    }
    return 1;
  }

  const last = row.last_active_date;
  if (last === today) {
    return Number(row.current_streak ?? 0);
  }

  let nextCurrent = 1;
  if (last === yesterday) {
    nextCurrent = Number(row.current_streak ?? 0) + 1;
  }

  const nextLongest = Math.max(Number(row.longest_streak ?? 0), nextCurrent);
  const { error: updateError } = await supabase
    .from("user_streaks")
    .update({
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to update streak: ${updateError.message}`);
  }

  return nextCurrent;
}

export async function getStreak(userId: string): Promise<number> {
  if (!userId) return 0;
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return 0;
  }
  return Number((data as { current_streak?: number | null } | null)?.current_streak ?? 0);
}
