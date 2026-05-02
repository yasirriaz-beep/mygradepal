import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { topicContentSubtopicKey } from "@/lib/topicContentSubtopic";

/** Stored in topic_content.subject — must match generate_topic_content / DB constraint */
const CHEMISTRY_SUBJECT = "Chemistry 0620";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/** Live tutor loads: cheap / fast (batch scripts may use Sonnet separately). */
const LIVE_MODEL = "claude-haiku-4-5-20251001";

function stripMarkdownFences(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, "");
  text = text.replace(/^```\s*/, "");
  text = text.replace(/\s*```$/, "");
  return text.trim();
}

function parseGeneratedJson(text: string): Record<string, unknown> | null {
  const stripped = stripMarkdownFences(text);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSubtopic = searchParams.get("subtopic")?.trim() ?? "";
  const subtopic = topicContentSubtopicKey(rawSubtopic);

  if (!subtopic) {
    return NextResponse.json({ error: "Missing subtopic" }, { status: 400 });
  }

  console.log("[topic-content] subtopic:", subtopic);

  const supabase = getSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("topic_content")
    .select("*")
    .eq("subject", CHEMISTRY_SUBJECT)
    .eq("subtopic", subtopic)
    .maybeSingle();

  console.log("[topic-content] cache hit:", !!existing);

  if (existing) {
    return NextResponse.json(existing);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  let qmeta = (
    await supabase.from("questions").select("topic").eq("subtopic", subtopic).limit(1).maybeSingle()
  ).data;
  if (!qmeta && rawSubtopic && rawSubtopic !== subtopic) {
    qmeta = (
      await supabase.from("questions").select("topic").eq("subtopic", rawSubtopic).limit(1).maybeSingle()
    ).data;
  }

  const chapterTitle = typeof qmeta?.topic === "string" && qmeta.topic.trim() ? qmeta.topic.trim() : subtopic;

  console.log("[topic-content] CALLING CLAUDE - costs money");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LIVE_MODEL,
      max_tokens: 4000,
      system:
        "Return ONLY valid JSON with these fields: definition (string), key_points (string[]), formulas (array of {formula:string,variables:string}), worked_example ({question:string,steps:string[],answer:string,takeaway:string}), exam_tip (string), quick_check (string), urdu_summary (string). Use audio_url_en as null in your mental model — omit it or set null. No markdown outside the JSON object.",
      messages: [
        {
          role: "user",
          content: `Generate concise IGCSE Chemistry 0620 learning content for subtopic: ${subtopic}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const anthropicData = await response.json();
  const text = anthropicData?.content?.find((item: { type?: string }) => item.type === "text")?.text;
  if (!text) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const parsed = parseGeneratedJson(String(text));
  if (!parsed) {
    return NextResponse.json({ error: "Generated content parse failed" }, { status: 500 });
  }

  const payload = {
    subject: CHEMISTRY_SUBJECT,
    chapter_title: chapterTitle,
    subtopic,
    chapter_number: 1,
    section: chapterTitle,
    definition: String(parsed.definition ?? ""),
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
    formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
    worked_example: parsed.worked_example ?? null,
    exam_tip: String(parsed.exam_tip ?? ""),
    quick_check: String(parsed.quick_check ?? ""),
    urdu_summary: String(parsed.urdu_summary ?? ""),
    audio_url_en: null as string | null,
  };

  const { data: saved, error: upsertError } = await supabase
    .from("topic_content")
    .upsert(payload, { onConflict: "subject,subtopic" })
    .select("*")
    .single();

  if (upsertError) {
    console.error("[topic-content] upsert", upsertError.message);
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
  }

  return NextResponse.json(saved ?? payload);
}
