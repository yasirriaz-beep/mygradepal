import type { ExamQuestionRow } from "@/lib/examTypes";
import { SUBJECT_FILTER } from "@/lib/examUtils";
import { supabase } from "@/lib/supabase";

const SELECT =
  "id, question_id, topic, subtopic, marks, difficulty, year, paper_type, question_type, question_text, mark_scheme, exam_tip, has_diagram, image_ref, options_json, mygradepal_explanation, source";

/** Match Cambridge-style question IDs to syllabus papers (approximate patterns). */
export function matchesFullPaper(questionId: string, paperLabel: string): boolean {
  const id = questionId.replace(/\s+/g, "").toLowerCase();

  if (paperLabel === "Paper 2") {
    return /(^|[^\d])(p21|p22|p23)\d?_q/.test(id) || /(^|[^\d])(qp.?21|qp.?22|qp.?23)(_|$|$)/i.test(id);
  }
  if (paperLabel === "Paper 4") {
    return /(^|[^\d])(p41|p42|p43)\d?_q/.test(id) || /(^|[^\d])(qp.?41|qp.?42|qp.?43)/i.test(id);
  }
  if (paperLabel === "Paper 6") {
    return (
      /(^|[^\d])(p61|p62|p63)\d?_q/.test(id) ||
      /(^|[^\d])(qp.?61|qp.?62|qp.?63)/i.test(id) ||
      id.includes("alternative")
    );
  }
  return false;
}

/** Load all Chemistry questions for a year, then narrow by inferred paper slot. */
export async function fetchFullPaperExamQuestions(year: number, paperLabel: string): Promise<ExamQuestionRow[]> {
  const pool: ExamQuestionRow[] = [];
  let from = 0;
  const PAGE = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from("questions")
      .select(SELECT)
      .eq("subject", SUBJECT_FILTER)
      .eq("year", year)
      .range(from, from + PAGE - 1);

    if (error || !data?.length) break;

    const rows = data as ExamQuestionRow[];
    for (const r of rows) {
      if (!matchesFullPaper(r.question_id, paperLabel)) continue;
      pool.push(r);
    }

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return pool.sort((a, b) => a.question_id.localeCompare(b.question_id));
}
