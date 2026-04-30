import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { sendAbsenceAlert } from "@/lib/alerts";
import * as Sentry from "@sentry/nextjs";

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isScheduledToday(daysPerWeek: number, dayOfWeek: number): boolean {
  // JS dayOfWeek: 0=Sun ... 6=Sat
  if (daysPerWeek >= 7) return true;
  if (daysPerWeek <= 0) return false;
  if (daysPerWeek <= 5) return dayOfWeek >= 1 && dayOfWeek <= daysPerWeek;
  if (daysPerWeek === 6) return dayOfWeek !== 0; // every day except Sunday
  return false;
}

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    const now = new Date();
    const today = toIsoDate(now);
    const dayOfWeek = now.getDay();

    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id, days_per_week, student_name")
      .not("user_id", "is", null);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    let checked = 0;
    let alerted = 0;

    for (const row of (profiles ?? []) as Array<{ user_id: string; days_per_week?: number | null }>) {
      const userId = row.user_id;
      const daysPerWeek = Number(row.days_per_week ?? 0);
      if (!userId) continue;
      checked += 1;

      if (!isScheduledToday(daysPerWeek, dayOfWeek)) {
        continue;
      }

      const [{ data: sessionToday }, { data: alreadyAlerted }] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id")
          .eq("student_id", userId)
          .eq("date", today)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("user_alerts")
          .select("id")
          .eq("user_id", userId)
          .eq("alert_type", "absence")
          .gte("sent_at", `${today}T00:00:00`)
          .lte("sent_at", `${today}T23:59:59`)
          .limit(1)
          .maybeSingle(),
      ]);

      if (sessionToday || alreadyAlerted) {
        continue;
      }

      await sendAbsenceAlert(userId, today, "study");
      alerted += 1;
    }

    return NextResponse.json({ ok: true, checked, alerted, date: today });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({ error: "Failed to check absences." }, { status: 500 });
  }
}
