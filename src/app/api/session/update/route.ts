import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type Body = {
  sessionId?: string;
  studentId?: string;
  incrementMinutes?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const sessionId = String(body.sessionId ?? "");
    const studentId = String(body.studentId ?? "demo-student");
    const increment = Math.max(0, Number(body.incrementMinutes ?? 1));
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: session } = await supabase.from("study_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const { data: schedule } = await supabase
      .from("schedules")
      .select("*")
      .eq("student_id", studentId)
      .eq("day_of_week", new Date().toLocaleDateString("en-US", { weekday: "long" }))
      .maybeSingle();

    const minDuration = Number(schedule?.min_duration_minutes ?? 45);
    const minQuestions = Number(schedule?.min_questions ?? 5);
    const nextDuration = Number(session.duration_minutes ?? 0) + increment;
    const attempted = Number(session.questions_attempted ?? 0);
    const complete = nextDuration >= minDuration && attempted >= minQuestions;

    const payload: Record<string, unknown> = {
      duration_minutes: nextDuration,
      ended_at: new Date().toISOString(),
      session_complete: complete,
    };

    if (complete) {
      payload.parent_notified = true;
    }

    await supabase.from("study_sessions").update(payload).eq("id", sessionId);

    if (complete && !session.session_complete) {
      await fetch(new URL("/api/parent/notify", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: "demo-parent",
          studentId,
          type: "session_complete",
          message: `Well done! Ahmed completed today's session in ${nextDuration} minutes.`,
        }),
      });
    }

    return NextResponse.json({
      complete,
      message: complete ? "Well done!" : "Session updated.",
      durationMinutes: nextDuration,
      questionsAttempted: attempted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
