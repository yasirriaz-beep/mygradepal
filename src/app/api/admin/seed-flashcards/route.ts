import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FLASHCARD_SEED } from "@/lib/flashcard-seed";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const { data, error } = await supabase
    .from("flashcards")
    .upsert(
      FLASHCARD_SEED.map(card => ({
        ...card,
        is_platform: true,
        created_by: null,
      })),
      { onConflict: "subject,chapter,front" }
    )
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    seeded: data?.length ?? 0,
    message: `${data?.length} flashcards seeded successfully`
  });
}
