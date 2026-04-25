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

import { getSupabaseServiceClient } from "@/lib/supabase";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

type TutorRequest = {
  subject: string;
  topic: string;
  message: string;
  history: Array<{ role: "assistant" | "user"; content: string }>;
  languageMode?: "english" | "urdu";
  studentId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TutorRequest;
    const { subject, topic, message, history, languageMode = "english", studentId = "demo-student" } = body;

    if (!subject || !topic || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: weakTopicData } = await supabase
      .from("topic_scores")
      .select("topic, mastery, score_percent")
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

    const systemPrompt = `You are MyGradePal, a friendly and expert IGCSE tutor for Pakistani students aged 14-16. You are currently teaching ${subject} — specifically the topic: ${topic}.

Teaching style:
- Start by asking what the student already knows
- Explain concepts in simple English, use Pakistani examples where natural (cricket, local food, cities)
- Break complex ideas into small steps
- After every explanation ask a quick check question
- If student is confused, try a completely different explanation approach
- Celebrate correct answers warmly
- Never make student feel bad for wrong answers
- Keep responses under 120 words unless explaining a complex concept that needs more space
- If student writes in Urdu or Roman Urdu, reply in the same language naturally

Current student weak topics (prioritise these): ${weakTopics || "No weak topic data yet"}
Exam is approaching — focus on exam technique too.
${languageMode === "urdu" ? `The student has selected Urdu mode. Respond in simple Urdu mixed with English technical terms. Write in Roman Urdu (English letters) not Nastaliq script, as it is easier to read on screen for most Pakistani students. Example: "Photosynthesis mein plants sunlight use karte hain food banane ke liye"` : ""}`;

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
        model: "claude-sonnet-4-5",
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
    const text = data?.content?.find((item: { type?: string }) => item.type === "text")?.text;
    if (!text) {
      return NextResponse.json({ error: "No tutor response from Claude." }, { status: 500 });
    }

    return NextResponse.json({ message: String(text).trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tutor route failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
