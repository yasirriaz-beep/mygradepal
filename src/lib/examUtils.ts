import type { ExamQuestionRow } from "./examTypes";

export const EXAM_SESSION_KEY = "mgp_exam_session_v1";
export const EXAM_RESULTS_KEY = "mgp_exam_last_results_v1";

export const SUBJECT_FILTER = "Chemistry 0620";
export const BRAND_TEAL = "#189080";
export const BRAND_ORANGE = "#f5731e";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function parseMcqOptions(
  optionsJson: string | null | undefined,
): { A: string; B: string; C: string; D: string } | null {
  if (!optionsJson?.trim()) return null;
  try {
    const o = JSON.parse(optionsJson) as Record<string, string>;
    const A = String(o.A ?? "").trim();
    const B = String(o.B ?? "").trim();
    const C = String(o.C ?? "").trim();
    const D = String(o.D ?? "").trim();
    if (!A && !B && !C && !D) return null;
    return { A, B, C, D };
  } catch {
    return null;
  }
}

export function isMcqQuestion(q: ExamQuestionRow): boolean {
  return parseMcqOptions(q.options_json) !== null;
}

export function cambridgeGrade(percent: number): string {
  if (percent >= 90) return "A*";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  if (percent >= 40) return "E";
  return "U";
}

export function totalTimerSeconds(questions: Pick<ExamQuestionRow, "marks">[]): number {
  const marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  return Math.max(60, Math.round(marks * 90)); // 1.5 min per mark
}
