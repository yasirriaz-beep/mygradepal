import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import * as Sentry from "@sentry/nextjs";

type Body = {
  studentId?: string;
  source?: "practice" | "tutor" | "check";
  topic?: string;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultTopics: Record<string, string> = {
  Monday: "Stoichiometry",
  Tuesday: "Bonding",
  Wednesday: "Organic Chemistry",
  Thursday: "Electricity",
  Friday: "Algebra",
  Saturday: "Revision",
  Sunday: "Past Paper Practice",
};

function parseTimeToMinutes(value: string) {
  const [hh, mm] = value.split(":").map(Number);
  return hh * 60 + mm;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const studentId = body.studentId ?? "demo-student";
    const now = new Date();
    const dayOfWeek = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const supabase = getSupabaseServiceClient();
    const { data: schedule } = await supabase
      .from("schedules")
      .select("*")
      .eq("student_id", studentId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    const startTime = String(schedule?.start_time ?? "19:00");
    const endTime = String(schedule?.end_time ?? "21:00");
    const minDuration = Number(schedule?.min_duration_minutes ?? 45);
    const minQuestions = Number(schedule?.min_questions ?? 5);
    const assignedTopic = String(body.topic ?? schedule?.assigned_topic ?? defaultTopics[dayOfWeek] ?? "Study topic");

    const inWindow =
      Boolean(schedule?.is_active ?? true) &&
      currentMinutes >= parseTimeToMinutes(startTime) &&
      currentMinutes <= parseTimeToMinutes(endTime);

    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", now.toISOString().slice(0, 10))
      .maybeSingle();

    let record = session;
    if (!record && body.source !== "check") {
      const { data: inserted } = await supabase
        .from("study_sessions")
        .insert({
          student_id: studentId,
          date: now.toISOString().slice(0, 10),
          started_at: now.toISOString(),
          topics_covered: [assignedTopic],
        })
        .select("*")
        .single();
      record = inserted;

      await fetch(new URL("/api/parent/notify", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: "demo-parent",
          studentId,
          type: "session_started",
          message: "Ahmed has started today’s study session.",
        }),
      });
    }

    const isComplete = Boolean(record?.session_complete);
    const shouldLock = inWindow && !isComplete;

    return NextResponse.json({
      sessionId: record?.id ?? null,
      complete: isComplete,
      shouldLock,
      inWindow,
      studentName: "Ahmed",
      requirements: {
        minDurationMinutes: minDuration,
        minQuestions,
        assignedTopic,
        startTime,
        endTime,
      },
      progress: {
        durationMinutes: Number(record?.duration_minutes ?? 0),
        questionsAttempted: Number(record?.questions_attempted ?? 0),
        questionsCorrect: Number(record?.questions_correct ?? 0),
      },
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Failed to start session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
