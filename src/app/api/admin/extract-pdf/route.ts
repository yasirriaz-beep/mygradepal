import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ExtractedQuestion = {
  question_id: string;
  question_text: string;
  answer: string;
  topic: string;
  subtopic: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  diagram_required: boolean;
  approved?: boolean;
};

const EXTRACTION_PROMPT = `You are extracting questions from a Cambridge IGCSE Chemistry 0620 Paper 4 exam.

You are provided:
1. The Question Paper (QP) full text with page markers
2. The Mark Scheme (MS) full text with page markers
3. Page images from both files (PNG)

Extract EVERY sub-question and return a JSON array.

Return ONLY a JSON array, no markdown, no preamble.
For each sub-question include ALL of these fields:
- question_id: format 0620_[session][yy]_p[paper]_q[num][subpart]  e.g. 0620_s25_p42_q1a
- topic: Cambridge 0620 syllabus topic name
- subtopic: specific concept within topic
- question_text: clean question text, no formatting artifacts
- answer: complete answer from mark scheme (all valid mark points)
- marks: integer
- difficulty: "easy" | "medium" | "hard"  (judge by marks + cognitive demand)
- ao_level: "AO1" | "AO2" | "AO3"
- question_type: "short" | "calculation" | "equation" | "diagram" | "explanation"
- diagram_required: true | false
- figure_description: detailed description of any diagram/figure/table/structural formula for recreation
- page_number: integer page number where this question appears in the QP
- image_ref: "{paper_id}/page_{n}.png" where n is the QP page number

RULES:
- Split ALL sub-parts separately: a, b, c, (i), (ii), (iii) etc.
- NEVER merge two sub-parts into one entry
- If a sub-part has multiple answer points, include ALL of them in the answer field
- Use consistent topic names (match Cambridge 0620 syllabus chapters)
- Clean up any PDF extraction artifacts (e.g. line breaks mid-sentence, page numbers)
- If the mark scheme says "any two from" list all options separated by " / "
- diagram_required = true if student must draw or label something
- Use the supplied page images to identify diagrams, figures, tables, and structural formulas
- Use visual evidence from images to improve extraction quality and question boundaries
- If no diagram/figure applies, set figure_description to ""
- page_number must refer to QUESTION PAPER page number, not mark scheme page

Cambridge 0620 topic names to use (use EXACTLY these):
- States of Matter
- Atoms Elements and Compounds
- Stoichiometry
- Electrochemistry
- Chemical Energetics
- Chemical Reactions
- Acids Bases and Salts
- The Periodic Table
- Metals
- Air and Water
- Organic Chemistry
- Experimental Techniques
`;

function toDifficultyNumber(d?: string): number {
  const value = String(d ?? "medium").toLowerCase();
  if (value === "easy") return 2;
  if (value === "hard") return 4;
  return 3;
}

function parseClaudeArray(raw: string): ExtractedQuestion[] {
  const clean = raw.replace(/```json|```/gi, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  const arrText = start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
  return JSON.parse(arrText) as ExtractedQuestion[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const qpFile = formData.get("qp_pdf") as File | null;
    const msFile = formData.get("ms_pdf") as File | null;
    const subject = String(formData.get("subject") ?? "");
    const paperType = String(formData.get("paper_type") ?? "");

    if (!qpFile || !msFile || !subject || !paperType) {
      return NextResponse.json({ error: "Missing required fields or files." }, { status: 400 });
    }

    const qpBuffer = Buffer.from(await qpFile.arrayBuffer());
    const msBuffer = Buffer.from(await msFile.arrayBuffer());
    const qpBase64 = qpBuffer.toString("base64");
    const msBase64 = msBuffer.toString("base64");

    const contentBlocks: Anthropic.Messages.MessageParam["content"] = [
      {
        type: "text",
        text: `Subject: ${subject}\nPaper Type: ${paperType}\n\nQuestion Paper and Mark Scheme are attached as PDF documents.`,
      },
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: qpBase64 },
      } as never,
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: msBase64 },
      } as never,
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      system: EXTRACTION_PROMPT,
      messages: [{ role: "user", content: contentBlocks }],
    });
    const rawText = response.content
      .filter((item) => item.type === "text")
      .map((item) => (item as { type: "text"; text: string }).text)
      .join("");
    const questions = parseClaudeArray(rawText);
    return NextResponse.json(questions);
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({ error: "PDF extraction failed." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { questions, meta } = (await req.json()) as {
      questions: ExtractedQuestion[];
      meta: { subject: string; paperType: string };
    };

    const approved = questions.filter((q) => q.approved !== false);
    if (approved.length === 0) {
      return NextResponse.json({ error: "No questions approved." }, { status: 400 });
    }

    const rows = approved.map((q, idx) => ({
      subject: meta.subject,
      paper_code:
        meta.subject === "Physics"
          ? "0625"
          : meta.subject === "Mathematics"
            ? "0580"
            : meta.subject === "Biology"
              ? "0610"
              : "0620",
      year: new Date().getFullYear(),
      session: "Imported",
      paper_type: meta.paperType,
      question_number: q.question_id || String(idx + 1),
      topic: q.topic ?? "",
      subtopic: q.subtopic ?? "",
      difficulty: toDifficultyNumber(q.difficulty),
      marks: Number(q.marks || 1),
      question_text: q.question_text ?? "",
      mark_scheme: q.answer ?? "",
      grade_level: "igcse",
      frequency_score: 50,
      prediction_tier: "possible",
      diagram_required: Boolean(q.diagram_required),
    }));

    const { data, error } = await supabase.from("questions").insert(rows).select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: data?.length ?? 0 });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
}
