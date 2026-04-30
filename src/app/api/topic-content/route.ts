import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");
  const subtopic = searchParams.get("subtopic");

  if (!subject || !subtopic) {
    return NextResponse.json({ error: "Missing subject or subtopic" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("topic_content")
    .select("*")
    .eq("subject", subject)
    .eq("subtopic", subtopic)
    .single();

  if (data) {
    return NextResponse.json(data);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 900,
      system:
        "Return ONLY valid JSON with these fields: definition (string), key_points (string[]), formulas (array of {formula:string,variables:string}), worked_example ({question:string,steps:string[],answer:string,takeaway:string}), exam_tip (string), quick_check (string), urdu_summary (string), audio_url_en (null).",
      messages: [
        {
          role: "user",
          content: `Generate concise IGCSE ${subject} learning content for subtopic: ${subtopic}`,
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(String(text).replace(/```json|```/g, "").trim()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Generated content parse failed" }, { status: 500 });
  }

  const payload = {
    subject,
    subtopic,
    definition: String(parsed.definition ?? ""),
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
    formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
    worked_example: parsed.worked_example ?? null,
    exam_tip: String(parsed.exam_tip ?? ""),
    quick_check: String(parsed.quick_check ?? ""),
    urdu_summary: String(parsed.urdu_summary ?? ""),
    audio_url_en: null,
  };

  const { data: saved } = await supabase.from("topic_content").upsert(payload).select("*").single();
  return NextResponse.json(saved ?? payload);
}
