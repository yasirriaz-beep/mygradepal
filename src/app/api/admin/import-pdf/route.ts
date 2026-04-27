import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ExtractedQuestion {
  question_number: string;
  question_text: string;
  marks: number;
  topic: string;
  subtopic: string;
  difficulty: "easy" | "medium" | "hard";
  mark_scheme: string;
}

function difficultyToNumber(d?: string): number {
  const x = (d ?? "medium").toLowerCase();
  if (x === "easy") return 2;
  if (x === "hard") return 4;
  return 3;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File;
    const subject = formData.get("subject") as string;
    const year = formData.get("year") as string;
    const session = formData.get("session") as string;
    const paperNum = formData.get("paper") as string;
    const paperCode = formData.get("code") as string;

    if (!file || !subject || !year || !session) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64PDF = Buffer.from(bytes).toString("base64");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64PDF,
              },
            },
            {
              type: "text",
              text: `You are extracting questions from a Cambridge O Level / IGCSE ${subject} past paper.

Paper details:
- Subject: ${subject}
- Year: ${year}
- Session: ${session}
- Paper: ${paperNum}
- Paper Code: ${paperCode}

Extract EVERY question from this paper. For each question return a JSON array with this exact shape:

[
  {
    "question_number": "1a",
    "question_text": "full question text here, include all sub-parts",
    "marks": 2,
    "topic": "Stoichiometry",
    "subtopic": "The Mole and Mole Calculations",
    "difficulty": "medium",
    "mark_scheme": "leave blank if this is a question paper not mark scheme"
  }
]

Topic must be one of the standard Cambridge ${subject} topics.
Difficulty: easy = recall/define, medium = apply/calculate, hard = analyse/evaluate.
Return ONLY the JSON array. No explanation. No markdown. No preamble.`,
            },
          ],
        },
      ],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let questions: ExtractedQuestion[];
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      questions = JSON.parse(clean) as ExtractedQuestion[];
    } catch {
      return NextResponse.json(
        { error: "Claude could not parse the PDF. Try a clearer scan.", raw: rawText.slice(0, 500) },
        { status: 422 },
      );
    }

    return NextResponse.json({
      questions,
      meta: { subject, year, session, paper: paperNum, code: paperCode, total: questions.length },
    });
  } catch (error) {
    console.error("PDF import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { questions, meta } = (await req.json()) as {
      questions: Array<ExtractedQuestion & { approved: boolean }>;
      meta: {
        subject: string;
        year: string;
        session: string;
        paper: string;
        code: string;
      };
    };

    const approved = questions.filter((q) => q.approved);

    if (approved.length === 0) {
      return NextResponse.json({ error: "No questions approved" }, { status: 400 });
    }

    const rows = approved.map((q, i) => ({
      subject: meta.subject,
      paper_code: meta.code,
      year: parseInt(meta.year, 10),
      session: meta.session,
      paper_type: `P${meta.paper}`,
      question_number: q.question_number || String(i + 1),
      topic: q.topic,
      subtopic: q.subtopic || "",
      difficulty: difficultyToNumber(q.difficulty),
      marks: q.marks || 1,
      question_text: q.question_text,
      mark_scheme: q.mark_scheme || "",
      grade_level: "igcse",
      frequency_score: 50,
      prediction_tier: "possible",
    }));

    const { data, error } = await supabase.from("questions").insert(rows).select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const topicCounts: Record<string, number> = {};
    approved.forEach((q) => {
      topicCounts[q.topic] = (topicCounts[q.topic] ?? 0) + 1;
    });

    for (const [topic, count] of Object.entries(topicCounts)) {
      const { error: rpcError } = await supabase.rpc("upsert_topic_pattern", {
        p_subject: meta.subject,
        p_topic: topic,
        p_year: parseInt(meta.year, 10),
        p_count: count,
      });
      if (rpcError) console.log("topic_patterns update skipped:", rpcError.message);
    }

    return NextResponse.json({ saved: data?.length ?? 0 });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
