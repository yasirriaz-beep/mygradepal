import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import * as Sentry from "@sentry/nextjs";

type ParsedQuestion = {
  subject: string | null;
  topic: string | null;
  year: number | null;
  session: string | null;
  paper_type: string | null;
  marks: number | null;
  question_text: string;
  mark_scheme: string;
  grade_level: string;
};

const extractValue = (block: string, key: string) => {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
};

const extractSection = (block: string, section: "QUESTION" | "MARKSCHEME") => {
  const regex =
    section === "QUESTION"
      ? /QUESTION:\s*([\s\S]*?)(?:\nMARKSCHEME:|$)/i
      : /MARKSCHEME:\s*([\s\S]*?)$/i;
  const match = block.match(regex);
  return match ? match[1].trim() : "";
};

const parseBlock = (block: string): ParsedQuestion | null => {
  const subject = extractValue(block, "SUBJECT");
  const topic = extractValue(block, "TOPIC");
  const year = Number(extractValue(block, "YEAR"));
  const session = extractValue(block, "SESSION");
  const paperType = extractValue(block, "TYPE");
  const marks = Number(extractValue(block, "MARKS"));
  const questionText = extractSection(block, "QUESTION");
  const markScheme = extractSection(block, "MARKSCHEME");

  if (!questionText) return null;

  return {
    subject: subject || null,
    topic: topic || null,
    year: Number.isFinite(year) ? year : null,
    session: session || null,
    paper_type: paperType || null,
    marks: Number.isFinite(marks) ? marks : null,
    question_text: questionText,
    mark_scheme: markScheme,
    grade_level: "igcse",
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const rawText = body.text?.trim() ?? "";
    if (!rawText) {
      return NextResponse.json({ error: "No bulk import text provided." }, { status: 400 });
    }

    const blocks = rawText
      .split(/\n---+\n/g)
      .map((block) => block.trim())
      .filter(Boolean);

    const parsed = blocks.map(parseBlock).filter((value): value is ParsedQuestion => Boolean(value));

    if (!parsed.length) {
      return NextResponse.json({ error: "No valid question blocks found." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("questions").insert(parsed);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, imported: parsed.length });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Bulk import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
