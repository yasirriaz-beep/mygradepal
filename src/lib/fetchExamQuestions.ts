import { supabase } from "@/lib/supabase";

import type { DifficultyFilter, ExamQuestionRow, YearFilter } from "./examTypes";
import { shuffle, SUBJECT_FILTER } from "./examUtils";

const PAGE = 1000;
const MAX_FETCH = 5000;

function applyYearFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  yearFilter: YearFilter,
) {
  if (yearFilter === "5y") return q.gte("year", 2020).lte("year", 2025);
  if (yearFilter === "3y") return q.gte("year", 2022).lte("year", 2025);
  return q;
}

function applyDifficulty(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  difficulty: DifficultyFilter,
) {
  if (difficulty === "all") return q;
  return q.eq("difficulty", difficulty);
}

export async function fetchExamQuestionPool(params: {
  topicValue: "all" | string;
  difficulty: DifficultyFilter;
  yearFilter: YearFilter;
}): Promise<ExamQuestionRow[]> {
  const out: ExamQuestionRow[] = [];
  let from = 0;
  for (;;) {
    let q = supabase
      .from("questions")
      .select(
        "id, question_id, topic, subtopic, marks, difficulty, year, paper_type, question_type, question_text, mark_scheme, exam_tip, has_diagram, image_ref, options_json, mygradepal_explanation, source",
      )
      .eq("subject", SUBJECT_FILTER);

    if (params.topicValue !== "all") {
      q = q.eq("topic", params.topicValue);
    }

    q = applyDifficulty(q, params.difficulty);
    q = applyYearFilter(q, params.yearFilter);

    const { data, error } = await q.order("question_id", { ascending: true }).range(from, from + PAGE - 1);

    if (error) {
      console.error("[exam] fetch questions", error);
      break;
    }

    const rows = (data ?? []) as ExamQuestionRow[];
    out.push(...rows);
    if (rows.length < PAGE || out.length >= MAX_FETCH) break;
    from += PAGE;
  }

  return out;
}

export function pickQuestionsForExam(
  pool: ExamQuestionRow[],
  countChoice: number | "all",
): ExamQuestionRow[] {
  const shuffled = shuffle(pool);
  if (countChoice === "all") return shuffled;
  return shuffled.slice(0, countChoice);
}
