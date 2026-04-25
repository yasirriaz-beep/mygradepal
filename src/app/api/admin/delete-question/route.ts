import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type DeleteQuestionBody = {
  id?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteQuestionBody;
    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing question id." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
