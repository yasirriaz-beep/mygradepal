import { NextResponse } from "next/server";

import { markAnswer } from "@/lib/claude";
import { getSupabaseServiceClient } from "@/lib/supabase";

type MarkRequestBody = {
  questionId: string | number;
  studentAnswer: string;
  studentId: string;
};

export async function POST(request: Request) {
  try {
    console.log("[/api/mark] Received POST request");
    const body = (await request.json()) as MarkRequestBody;
    console.log("[/api/mark] Parsed body:", body);
    const { questionId, studentAnswer, studentId } = body;

    if (!questionId || !studentAnswer || !studentId) {
      console.log("[/api/mark] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: questionId, studentAnswer, studentId" },
        { status: 400 },
      );
    }

    console.log("[/api/mark] Initializing Supabase service client");
    const supabase = getSupabaseServiceClient();

    console.log("[/api/mark] Fetching question:", questionId);
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("id, question_text, mark_scheme, subject, topic")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      console.log("[/api/mark] Question lookup failed:", questionError);
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    console.log("[/api/mark] Question found, calling Anthropic model claude-sonnet-4-20250514");
    const markingResult = await markAnswer({
      questionText: question.question_text,
      markScheme: question.mark_scheme,
      studentAnswer,
      subject: question.subject,
      topic: question.topic,
    });
    console.log("[/api/mark] Anthropic marking result:", markingResult);

    console.log("[/api/mark] Saving attempt to Supabase attempts table");
    const { error: attemptError } = await supabase.from("attempts").insert({
      question_id: question.id,
      student_id: studentId,
      student_answer: studentAnswer,
      marks_awarded: markingResult.marks_awarded,
      total_marks: markingResult.total_marks,
      feedback: markingResult.feedback,
      hint: markingResult.hint,
    });

    if (attemptError) {
      console.log("[/api/mark] Failed to save attempt:", attemptError);
      return NextResponse.json({ error: "Failed to save attempt." }, { status: 500 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", today)
      .maybeSingle();

    if (session) {
      const nextQuestions = Number(session.questions_attempted ?? 0) + 1;
      const nextCorrect = Number(session.questions_correct ?? 0) + (markingResult.marks_awarded > 0 ? 1 : 0);
      await supabase
        .from("study_sessions")
        .update({
          questions_attempted: nextQuestions,
          questions_correct: nextCorrect,
          topics_covered: Array.from(new Set([...(session.topics_covered ?? []), String(question.topic ?? "General")])),
        })
        .eq("id", session.id);
    }

    console.log("[/api/mark] Attempt saved successfully, returning JSON response");
    return NextResponse.json(markingResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    console.log("[/api/mark] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
