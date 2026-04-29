import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type McqOptions = { A: string; B: string; C: string; D: string };

function parseOptions(value: unknown): McqOptions | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as Record<string, unknown>).A === "string" &&
      typeof (parsed as Record<string, unknown>).B === "string" &&
      typeof (parsed as Record<string, unknown>).C === "string" &&
      typeof (parsed as Record<string, unknown>).D === "string"
    ) {
      return parsed as McqOptions;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST() {
  // Fetch up to 100 MCQ questions missing correct_answer
  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, question_text, options_json, mark_scheme")
    .eq("subject", "Chemistry")
    .not("options_json", "is", null)
    .or("correct_answer.is.null,correct_answer.eq.")
    .limit(100);

  if (error || !questions?.length) {
    return NextResponse.json({ error: error?.message ?? "No questions found" });
  }

  let updated = 0;
  let failed = 0;

  for (const q of questions) {
    try {
      const options = parseOptions(q.options_json);
      if (!options) {
        failed++;
        continue;
      }

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: `Question: ${q.question_text}
Options: A) ${options.A} B) ${options.B} C) ${options.C} D) ${options.D}
Mark scheme: ${q.mark_scheme}

Reply with ONLY the single correct letter: A, B, C, or D. Nothing else.`,
          },
        ],
      });

      const letter = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
        .trim()
        .charAt(0)
        .toUpperCase();

      if (["A", "B", "C", "D"].includes(letter)) {
        await supabase.from("questions").update({ correct_answer: letter }).eq("id", q.id);
        updated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    processed: questions.length,
    updated,
    failed,
    message: `Updated ${updated} questions. Run again for next batch.`,
  });
}
