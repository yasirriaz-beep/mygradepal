/*
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id uuid default gen_random_uuid() primary key,
  student_id text,
  subject text,
  topic text,
  message_count integer default 0,
  started_at timestamp default now()
);
*/

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { getSupabaseServiceClient } from "@/lib/supabase";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

type TutorRequest = {
  subject: string;
  topic: string;
  message: string;
  history: Array<{ role: "assistant" | "user"; content: string }>;
  mode?: "explain" | "formulas" | "example" | "test" | "chat";
  languageMode?: "english" | "urdu";
  studentId?: string;
  targetGrade?: "C" | "B" | "A" | "A*";
};

function buildModeContentFromCache(row: Record<string, unknown>, mode: NonNullable<TutorRequest["mode"]>): string | null {
  if (typeof row.content === "string" && row.content.trim()) return row.content;
  if (mode === "explain") {
    const definition = String(row.definition ?? "").trim();
    const points = Array.isArray(row.key_points) ? (row.key_points as unknown[]).map((p) => String(p)).filter(Boolean) : [];
    if (definition || points.length > 0) {
      return `DEFINITION: ${definition}\nKEY POINTS:\n${points.map((p) => `- ${p}`).join("\n")}`.trim();
    }
  }
  if (mode === "formulas") {
    const formulas = Array.isArray(row.formulas) ? (row.formulas as Array<{ formula?: string; variables?: string }>) : [];
    if (formulas.length > 0) {
      return formulas
        .map((f) => `FORMULA: ${String(f.formula ?? "")}\nVARIABLES: ${String(f.variables ?? "")}`.trim())
        .join("\n\n");
    }
  }
  if (mode === "example") {
    const worked = (row.worked_example as { question?: string; steps?: string[]; answer?: string; takeaway?: string } | null) ?? null;
    if (worked?.question) {
      return `WORKED EXAMPLE:\nQUESTION: ${worked.question}\n${(worked.steps ?? []).join("\n")}\nANSWER: ${worked.answer ?? ""}\nTAKEAWAY: ${worked.takeaway ?? ""}`.trim();
    }
  }
  if (mode === "test") {
    const quick = String(row.quick_check ?? "").trim();
    if (quick) return quick;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TutorRequest;
    const { subject, topic, message, history, mode = "chat", languageMode = "english", studentId = "demo-student", targetGrade } = body;

    if (!subject || !topic || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const supabase = getSupabaseServiceClient();
    const existing = await supabase
      .from("topic_content")
      .select("*")
      .eq("subject", subject)
      .eq("subtopic", topic)
      .single();
    if (existing.data && mode !== "chat") {
      const cached = buildModeContentFromCache(existing.data as Record<string, unknown>, mode);
      if (cached) {
        return NextResponse.json({ message: cached, cached: true });
      }
    }
    const { data: studentData } = await supabase
      .from("students")
      .select("target_grade")
      .eq("id", studentId)
      .single();

    const resolvedTargetGrade = String(targetGrade ?? studentData?.target_grade ?? "C") as "C" | "B" | "A" | "A*";
    const gradeGuidance: Record<"C" | "B" | "A" | "A*", string> = {
      C: "Focus on Core syllabus content only. Keep explanations simple. Test questions should be straightforward recall and basic application.",
      B: "Cover Core content thoroughly. Include some application questions. Test questions should mix recall with problem-solving.",
      A: "Cover both Core and Supplement content. Push for deeper understanding. Test questions should include analysis and multi-step problems.",
      "A*": "Cover all Core and Supplement content in full depth. Challenge the student with complex problems. Test questions should match the hardest Cambridge exam questions.",
    };
    const gradeInstruction = gradeGuidance[resolvedTargetGrade] ?? gradeGuidance.C;
    const { data: weakTopicData } = await supabase
      .from("topic_scores")
      .select("topic, mastery")
      .eq("student_id", studentId)
      .eq("subject", subject)
      .order("mastery", { ascending: true })
      .limit(3);

    const weakTopics = (weakTopicData ?? [])
      .map((row) => String(row.topic ?? ""))
      .filter(Boolean)
      .join(", ");

    const recentHistory = (history ?? []).slice(-10).map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content,
    }));

    const learnPrompt = `You are an expert O Level / IGCSE tutor on MyGradePal for Pakistani students.

When teaching a topic, respond using ONLY these exact section headers. No markdown. No stars. No backticks. Plain text only.

DEFINITION:
One clear sentence defining the concept.

KEY POINTS:
- Point 1
- Point 2
- Point 3
- Point 4 (optional)
- Point 5 (optional, max 5)

FORMULA:
Write the formula in plain text (e.g. Moles = Mass / Molar Mass)
VARIABLES:
Explain what each variable means in one line.
(Repeat FORMULA / VARIABLES block for each formula if there are multiple)

WORKED EXAMPLE:
QUESTION: A clear exam style question
STEP 1: First step
STEP 2: Second step
STEP 3: Third step (if needed)
ANSWER: The final answer clearly stated
TAKEAWAY: One sentence on what this example teaches

EXAM TIP:
The single most important exam tip or common mistake to avoid.

QUICK CHECK:
One short question for the student to try themselves.`;

    const promptsByMode: Record<NonNullable<TutorRequest["mode"]>, string> = {
      explain: learnPrompt,
      formulas: learnPrompt,
      example: learnPrompt,
      test: learnPrompt,
      chat: `You are MyGradePal, a friendly and expert IGCSE tutor for Pakistani students aged 14-16. You are currently teaching ${subject} — specifically the topic: ${topic}.
Keep responses concise and practical for exams. No markdown, no stars, no backticks.`,
    };
    const systemPrompt = `${promptsByMode[mode]}

The student is targeting Grade ${resolvedTargetGrade}. ${gradeInstruction}`;

    const anthropicMessages = [
      ...recentHistory.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Anthropic tutor call failed: ${response.status} ${errorText}` },
        { status: 500 },
      );
    }

    const data = await response.json();
    const responseText = data?.content?.find((item: { type?: string }) => item.type === "text")?.text;
    if (!responseText) {
      return NextResponse.json({ error: "No tutor response from Claude." }, { status: 500 });
    }
    const cleanedText = String(responseText)
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}/g, "")
      .trim();

    if (mode !== "chat" && cleanedText) {
      await supabase.from("topic_content").upsert({
        subject,
        subtopic: topic,
        content: cleanedText,
      });
    }

    return NextResponse.json({ message: cleanedText });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Tutor route failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
