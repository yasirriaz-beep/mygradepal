import { NextResponse } from "next/server";

import { getAuthUserFromRequest } from "@/lib/getAuthUserFromRequest";
import { getSupabaseServiceClient } from "@/lib/supabase";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

type ProgressBody = {
  flashcard_id: string;
  status: string;
  next_review_at: string;
  times_seen?: number;
  times_correct?: number;
};

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<ProgressBody>;
  try {
    body = (await request.json()) as Partial<ProgressBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const flashcard_id = body.flashcard_id?.trim();
  const status = body.status?.trim();
  const next_review_at = body.next_review_at?.trim();

  if (!flashcard_id || !isUuid(flashcard_id)) {
    return NextResponse.json({ error: "Invalid flashcard_id" }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }
  if (!next_review_at || Number.isNaN(Date.parse(next_review_at))) {
    return NextResponse.json({ error: "Invalid next_review_at" }, { status: 400 });
  }

  const svc = getSupabaseServiceClient();
  const { data: existing } = await svc
    .from("flashcard_progress")
    .select("times_seen, times_correct")
    .eq("student_id", user.id)
    .eq("flashcard_id", flashcard_id)
    .maybeSingle();

  const times_seen = typeof body.times_seen === "number" ? body.times_seen : (existing?.times_seen ?? 0) + 1;
  const times_correct =
    typeof body.times_correct === "number" ? body.times_correct : (existing?.times_correct ?? 0);

  const row = {
    student_id: user.id,
    flashcard_id,
    status,
    times_seen,
    times_correct,
    next_review_at,
    last_seen_at: new Date().toISOString(),
  };

  const { error } = await svc.from("flashcard_progress").upsert(row, { onConflict: "student_id,flashcard_id" });

  if (error) {
    console.error("[flashcards/progress]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
