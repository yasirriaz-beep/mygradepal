import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateStreak } from "@/lib/streak";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { studentId, topic, subject, questionsAttempted } = await req.json() as {
    studentId: string;
    topic: string;
    subject: string;
    questionsAttempted: number;
  };

  if (!studentId || !topic) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Mark plan session complete
  await supabase
    .from("study_plan")
    .update({ completed: true })
    .eq("student_id", studentId)
    .eq("scheduled_date", today)
    .eq("topic", topic);

  // Log study session
  await supabase.from("study_sessions").insert({
    student_id:          studentId,
    date:                today,
    started_at:          new Date(Date.now() - 45 * 60000).toISOString(),
    ended_at:            new Date().toISOString(),
    duration_minutes:    45,
    questions_attempted: questionsAttempted ?? 0,
    topics_covered:      [topic],
    session_complete:    true,
  });
  await updateStreak(studentId);

  // Get next session
  const { data: next } = await supabase
    .from("study_plan")
    .select("topic, subtopic, scheduled_date")
    .eq("student_id", studentId)
    .eq("completed", false)
    .gt("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({ success: true, nextSession: next ?? null });
}
