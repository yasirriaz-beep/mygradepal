import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json() as {
      question: Record<string, unknown>;
    };

    const row = {
      subject: question.subject ?? "Chemistry",
      paper_code: question.subject === "Physics" ? "0625"
        : question.subject === "Mathematics" ? "0580"
          : question.subject === "Biology" ? "0610" : "0620",
      year: 2025,
      session: "Generated",
      paper_type: question.paper_type ?? "MCQ",
      question_number: String(Date.now()),
      topic: question.topic ?? "",
      subtopic: question.subtopic ?? "",
      difficulty: String(question.difficulty ?? "medium").toLowerCase(),
      marks: question.paper_type === "MCQ" ? 1 : 3,
      question_text: question.question_text ?? "",
      mark_scheme: question.mark_scheme ?? "See explanation",
      grade_level: "IGCSE",
      curriculum: "Cambridge",
      frequency_score: 50,
      prediction_tier: "possible",
      source: "MGP_Generated",
      correct_answer: question.correct_answer ?? "",
      feedback: question.feedback ?? "",
      options_json: question.options_json ?? null,
      common_mistake: question.common_mistake ?? "",
      exam_tip: question.exam_tip ?? "",
      syllabus_ref: question.syllabus_ref ?? "",
      command_word: question.command_word ?? "",
    };

    const { error: insertError } = await supabase
      .from("questions")
      .insert(row);

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("pending_questions")
      .update({ reviewed: true })
      .eq("id", String(question.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Approve error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string };

    await supabase
      .from("pending_questions")
      .update({ reviewed: true, review_notes: "rejected" })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
