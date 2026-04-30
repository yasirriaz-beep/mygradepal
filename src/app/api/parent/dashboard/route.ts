import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import * as Sentry from "@sentry/nextjs";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    const studentId = "demo-student";
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const day = dayNames[now.getDay()];

    const [{ data: session }, { data: schedule }, { data: weekSessions }] = await Promise.all([
      supabase.from("study_sessions").select("*").eq("student_id", studentId).eq("date", today).maybeSingle(),
      supabase.from("schedules").select("*").eq("student_id", studentId).eq("day_of_week", day).maybeSingle(),
      supabase
        .from("study_sessions")
        .select("date, duration_minutes, session_complete")
        .eq("student_id", studentId)
        .gte("date", new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10))
        .order("date", { ascending: true }),
    ]);

    const startTime = String(schedule?.start_time ?? "19:00");
    const endTime = String(schedule?.end_time ?? "21:00");
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const inWindow = minutesNow >= toMinutes(startTime) && minutesNow <= toMinutes(endTime);

    let topAlert;
    if (session?.session_complete) {
      const attempted = Number(session.questions_attempted ?? 0);
      const correct = Number(session.questions_correct ?? 0);
      const pct = attempted ? Math.round((correct / attempted) * 100) : 0;
      topAlert = {
        state: "complete",
        title: `🎉 Session complete! Ahmed studied for ${session.duration_minutes ?? 0} minutes`,
        subtitle: `${attempted} questions answered · ${correct} correct (${pct}%) · Great session!`,
      };
    } else if (session?.started_at) {
      topAlert = {
        state: "in_progress",
        title: "✅ Ahmed is studying right now!",
        subtitle: `Started: ${new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Duration: ${session.duration_minutes ?? 0} minutes · Questions answered: ${session.questions_attempted ?? 0} · Topic: ${(session.topics_covered?.[0] ?? "Assigned topic")}`,
      };
    } else {
      const remaining = Math.max(0, toMinutes(endTime) - minutesNow);
      const hrs = Math.floor(remaining / 60);
      const mins = remaining % 60;
      topAlert = {
        state: "not_started",
        title: "⚠️ Ahmed has not started today's session",
        subtitle: `Session window: ${startTime} — ${endTime} • Required: 45 minutes minimum • Time remaining: ${hrs} hour ${mins} minutes`,
        cta: inWindow ? "Send WhatsApp reminder now" : "Notify at session start",
      };
    }

    const groupedByWeek = [0, 1, 2, 3].map((weekOffset) => {
      const start = new Date();
      start.setDate(now.getDate() - 7 * (weekOffset + 1));
      const end = new Date();
      end.setDate(now.getDate() - 7 * weekOffset);
      const rows = (weekSessions ?? []).filter((row) => {
        const d = new Date(String(row.date));
        return d >= start && d < end;
      });
      const completed = rows.filter((row) => Boolean(row.session_complete)).length;
      const scheduled = 7;
      return Math.round((completed / scheduled) * 100);
    });

    const latestWeek = groupedByWeek[0] || 0;
    const weekCalendar = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayLabel, i) => {
      const date = new Date();
      date.setDate(now.getDate() - ((now.getDay() + 6) % 7) + i);
      const key = date.toISOString().slice(0, 10);
      const entry = (weekSessions ?? []).find((row) => String(row.date) === key);
      const status = entry ? (entry.session_complete ? "complete" : "in_progress") : "missed";
      return { day: dayLabel, status, target: 45, actual: Number(entry?.duration_minutes ?? 0) };
    });

    let streak = 0;
    for (let i = 0; i < 30; i += 1) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const match = (weekSessions ?? []).find((row) => String(row.date) === key && Boolean(row.session_complete));
      if (match) streak += 1;
      else break;
    }

    return NextResponse.json({
      childName: "Ahmed",
      topAlert,
      disciplineScore: latestWeek,
      trend: groupedByWeek.reverse(),
      streakDays: streak || 7,
      longestStreak: Math.max(streak, 7),
      weekCalendar,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({
      childName: "Ahmed",
      topAlert: {
        state: "not_started",
        title: "⚠️ Ahmed has not started today's session",
        subtitle:
          "Session window: 7:00 PM — 9:00 PM • Required: 45 minutes minimum • Time remaining: 1 hour 23 minutes",
        cta: "Send WhatsApp reminder now",
      },
      disciplineScore: 78,
      trend: [71, 75, 82, 78],
      streakDays: 7,
      longestStreak: 7,
      weekCalendar: [
        { day: "Mon", status: "complete", target: 45, actual: 24 },
        { day: "Tue", status: "missed", target: 45, actual: 0 },
        { day: "Wed", status: "complete", target: 45, actual: 31 },
        { day: "Thu", status: "in_progress", target: 45, actual: 12 },
        { day: "Fri", status: "rest", target: 0, actual: 0 },
        { day: "Sat", status: "complete", target: 45, actual: 22 },
        { day: "Sun", status: "complete", target: 45, actual: 25 },
      ],
    });
  }
}
