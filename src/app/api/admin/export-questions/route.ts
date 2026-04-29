import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      topic,
      subtopic,
      difficulty,
      paper_type,
      question_text,
      options_json,
      correct_answer,
      mark_scheme,
      common_mistake,
      exam_tip,
      syllabus_ref
    `)
    .eq("subject", "Chemistry")
    .not("options_json", "is", null)
    .order("topic")
    .order("difficulty");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map(q => {
    const opts = q.options_json
      ? JSON.parse(q.options_json as string)
      : {};
    return {
      Topic: q.topic ?? "",
      Subtopic: q.subtopic ?? "",
      Difficulty: q.difficulty ?? "",
      Type: q.paper_type ?? "",
      Question: q.question_text ?? "",
      "Option A": opts.A ?? "",
      "Option B": opts.B ?? "",
      "Option C": opts.C ?? "",
      "Option D": opts.D ?? "",
      "Correct Answer": q.correct_answer ?? "",
      "Mark Scheme": q.mark_scheme ?? "",
      "Common Mistake": q.common_mistake ?? "",
      "Exam Tip": q.exam_tip ?? "",
      "Syllabus Ref": q.syllabus_ref ?? "",
    };
  });

  if (rows.length === 0) {
    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition":
          'attachment; filename="MyGradePal_Chemistry_Questions.csv"',
      },
    });
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const val = String((row as Record<string, string>)[h] ?? "")
          .replace(/"/g, '""')
          .replace(/\n/g, " ");
        return `"${val}"`;
      }).join(",")
    )
  ];

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="MyGradePal_Chemistry_Questions.csv"',
    },
  });
}
