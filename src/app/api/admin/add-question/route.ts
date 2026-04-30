import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import * as Sentry from "@sentry/nextjs";

type AddQuestionBody = {
  subject?: string;
  grade_level?: string;
  year?: number;
  session?: string;
  paper_type?: string;
  paper_code?: string;
  question_number?: string;
  topic?: string;
  subtopic?: string;
  marks?: number;
  difficulty?: number;
  frequency_score?: number;
  prediction_tier?: string;
  question_text?: string;
  mark_scheme?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddQuestionBody;
    const supabase = getSupabaseServiceClient();

    const payload = {
      subject: body.subject ?? null,
      grade_level: body.grade_level ?? null,
      year: Number(body.year ?? 0) || null,
      session: body.session ?? null,
      paper_type: body.paper_type ?? null,
      paper_code: body.paper_code ?? null,
      question_number: body.question_number ?? null,
      topic: body.topic ?? null,
      subtopic: body.subtopic ?? null,
      marks: Number(body.marks ?? 0) || null,
      difficulty: Number(body.difficulty ?? 0) || null,
      frequency_score: Number(body.frequency_score ?? 0) || null,
      prediction_tier: body.prediction_tier ?? null,
      question_text: body.question_text ?? "",
      mark_scheme: body.mark_scheme ?? "",
    };

    const { error } = await supabase.from("questions").insert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Failed to add question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
