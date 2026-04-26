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

  if (error || !data) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
