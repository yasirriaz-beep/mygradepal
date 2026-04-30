import { getSupabaseServiceClient } from "@/lib/supabase";
import { getStreak } from "@/lib/streak";

type WeeklyReport = {
  user_id: string;
  week: string;
  student_name: string;
  sessions_completed: number;
  sessions_planned: number;
  questions_attempted: number;
  topics_covered: string[];
  current_streak: number;
  share_url: string;
};

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseWeekStart(week?: string): Date {
  if (week) {
    const parsed = new Date(`${week}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function buildWeeklyReport(userId: string, week?: string): Promise<WeeklyReport> {
  const supabase = getSupabaseServiceClient();
  const weekStart = parseWeekStart(week);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartIso = toIsoDate(weekStart);
  const weekEndIso = toIsoDate(weekEnd);

  const [{ data: student }, { data: attempts }, { data: sessions }, { data: planned }, streak] = await Promise.all([
    supabase.from("students").select("name").eq("id", userId).maybeSingle(),
    supabase
      .from("user_attempts")
      .select("question_id, attempted_at")
      .eq("user_id", userId)
      .gte("attempted_at", `${weekStartIso}T00:00:00`)
      .lte("attempted_at", `${weekEndIso}T23:59:59`),
    supabase
      .from("study_sessions")
      .select("id")
      .eq("student_id", userId)
      .eq("session_complete", true)
      .gte("date", weekStartIso)
      .lte("date", weekEndIso),
    supabase
      .from("study_plan")
      .select("id")
      .eq("student_id", userId)
      .gte("scheduled_date", weekStartIso)
      .lte("scheduled_date", weekEndIso),
    getStreak(userId),
  ]);

  const questionIds = Array.from(
    new Set(((attempts ?? []) as Array<{ question_id?: string }>).map((a) => a.question_id).filter(Boolean) as string[]),
  );

  let topicsCovered: string[] = [];
  if (questionIds.length > 0) {
    const { data: questionRows } = await supabase
      .from("questions")
      .select("topic, question_id")
      .in("question_id", questionIds);
    topicsCovered = Array.from(
      new Set(((questionRows ?? []) as Array<{ topic?: string }>).map((q) => q.topic).filter(Boolean) as string[]),
    );
  }

  return {
    user_id: userId,
    week: weekStartIso,
    student_name: String((student as { name?: string } | null)?.name ?? "Student"),
    sessions_completed: (sessions ?? []).length,
    sessions_planned: (planned ?? []).length,
    questions_attempted: (attempts ?? []).length,
    topics_covered: topicsCovered,
    current_streak: streak,
    share_url: `/report/${userId}/${weekStartIso}`,
  };
}
