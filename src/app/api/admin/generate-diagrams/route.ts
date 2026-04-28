import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from("questions")
    .select("id, topic, question_text, diagram_url")
    .eq("subject", "Chemistry")
    .eq("has_diagram", true)
    .order("topic", { ascending: true });

  return NextResponse.json({ questions: data ?? [] });
}
