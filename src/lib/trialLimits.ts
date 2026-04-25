import { supabase } from "@/lib/supabase";

export const TRIAL_LIMITS = {
  questions: 10,
  tutorMessages: 20,
  topics: 3,
};

export type TrialUsage = {
  questionsUsed: number;
  messagesUsed: number;
};

export async function getTrialUsage(studentId: string): Promise<TrialUsage> {
  const { count: questionsCount } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  const { data: tutorSessions } = await supabase
    .from("tutor_sessions")
    .select("message_count")
    .eq("student_id", studentId);

  const messagesUsed = (tutorSessions ?? []).reduce((sum, row) => {
    const count = Number((row as { message_count?: number }).message_count ?? 0);
    return sum + Math.max(0, count);
  }, 0);

  return {
    questionsUsed: questionsCount ?? 0,
    messagesUsed,
  };
}

export function isTrialExpired(startDate: string) {
  const days = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
  return days >= 7;
}
