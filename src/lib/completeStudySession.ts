import { supabase } from "@/lib/supabase";

export type NextPlanSession = {
  topic: string;
  subtopic: string;
  scheduled_date: string;
};

/** Marks today's plan row complete, logs study_sessions, returns next upcoming session (if any). */
export async function completeStudySession(params: {
  studentId: string;
  topic: string;
  questionsAttempted: number;
}): Promise<{ nextSession: NextPlanSession | null }> {
  const { studentId, topic, questionsAttempted } = params;
  const today = new Date().toISOString().split("T")[0];

  await supabase
    .from("study_plan")
    .update({ completed: true })
    .eq("student_id", studentId)
    .eq("scheduled_date", today)
    .eq("topic", topic);

  await supabase.from("study_sessions").insert({
    student_id: studentId,
    date: today,
    started_at: new Date(Date.now() - 45 * 60000).toISOString(),
    ended_at: new Date().toISOString(),
    duration_minutes: 45,
    questions_attempted: questionsAttempted,
    topics_covered: [topic],
    session_complete: true,
  });

  const { data: nextData } = await supabase
    .from("study_plan")
    .select("topic, subtopic, scheduled_date")
    .eq("student_id", studentId)
    .eq("completed", false)
    .gt("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { nextSession: (nextData as NextPlanSession | null) ?? null };
}
