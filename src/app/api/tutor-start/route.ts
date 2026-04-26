import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

type TutorStartRequest = {
  subject: string;
  topic: string;
  studentId: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TutorStartRequest;
    const { subject, topic, studentId } = body;

    if (!subject || !topic || !studentId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: scoreRow } = await supabase
      .from("topic_scores")
      .select("mastery")
      .eq("student_id", studentId)
      .eq("subject", subject)
      .eq("topic", topic)
      .maybeSingle();

    const mastery = Math.round(Number((scoreRow?.mastery as number) ?? 0));

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 450,
        system:
          "You are MyGradePal, a structured IGCSE tutor. Produce clean textbook-style mini-lessons for Pakistani students.",
        messages: [
          {
            role: "user",
            content: `Student name: Ahmed
Subject: ${subject}
Topic: ${topic}
Current mastery: ${mastery}%

Write the opening lesson in EXACT structure and headings:
📚 Topic: ${topic}

Let me teach you this step by step.

**What is ${topic.toLowerCase()}?**
[2-3 sentence simple explanation]

**Key formula you must know:**
[the most important formula]

**Example from a past paper:**
[simple worked example with 2-4 steps]

**Quick check:** [one simple question]

Keep it concise and student-friendly.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Anthropic start call failed: ${response.status} ${await response.text()}` },
        { status: 500 },
      );
    }

    const data = await response.json();
    const message = data?.content?.find((item: { type?: string }) => item.type === "text")?.text;
    if (!message) {
      return NextResponse.json({ error: "No opening message generated." }, { status: 500 });
    }
    const cleanedMessage = String(message)
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}/g, "")
      .trim();

    return NextResponse.json({ message: cleanedMessage, mastery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start tutor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
