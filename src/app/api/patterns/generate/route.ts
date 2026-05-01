import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase";

type QuestionRow = {
  topic: string | null;
  subtopic: string | null;
  marks: number | null;
  question_id: string | null;
};

type PatternRow = {
  topic: string;
  subtopic: string;
  frequency: number;
  avg_marks: number;
  probability: number;
};

export async function POST() {
  try {
    const supabase = getSupabaseServiceClient();

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("topic, subtopic, marks, question_id")
      .eq("source", "past_paper");

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    const rows = (questions ?? []) as QuestionRow[];
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        patterns_generated: 0,
        message: "No past-paper questions found.",
      });
    }

    const distinctQuestionIds = new Set(rows.map((row) => row.question_id).filter((id): id is string => Boolean(id)));
    const denominator = Math.max(distinctQuestionIds.size, 1);

    const aggregateMap = new Map<string, { topic: string; subtopic: string; frequency: number; marksSum: number; marksCount: number }>();

    for (const row of rows) {
      const topic = (row.topic ?? "").trim() || "Unknown";
      const subtopic = (row.subtopic ?? "").trim() || "Unknown";
      const key = `${topic}__${subtopic}`;

      const existing = aggregateMap.get(key) ?? { topic, subtopic, frequency: 0, marksSum: 0, marksCount: 0 };
      existing.frequency += 1;
      if (typeof row.marks === "number") {
        existing.marksSum += row.marks;
        existing.marksCount += 1;
      }
      aggregateMap.set(key, existing);
    }

    const patterns: PatternRow[] = Array.from(aggregateMap.values())
      .map((item) => {
        const avgMarksRaw = item.marksCount > 0 ? item.marksSum / item.marksCount : 0;
        const probabilityRaw = (item.frequency * 100) / denominator;
        return {
          topic: item.topic,
          subtopic: item.subtopic,
          frequency: item.frequency,
          avg_marks: Number(avgMarksRaw.toFixed(2)),
          probability: Number(probabilityRaw.toFixed(2)),
        };
      })
      .sort((a, b) => b.frequency - a.frequency);

    const { error: upsertError } = await supabase.from("patterns").upsert(patterns, { onConflict: "topic,subtopic" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      patterns_generated: patterns.length,
      total_questions_analyzed: rows.length,
      distinct_question_ids: denominator,
      patterns,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pattern generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
