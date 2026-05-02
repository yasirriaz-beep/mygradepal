import { NextResponse } from "next/server";

import { getAuthUserFromRequest } from "@/lib/getAuthUserFromRequest";
import { getSupabaseServiceClient } from "@/lib/supabase";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { flashcard_id?: string };
  try {
    body = (await request.json()) as { flashcard_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const flashcard_id = body.flashcard_id?.trim();
  if (!flashcard_id || !isUuid(flashcard_id)) {
    return NextResponse.json({ error: "Invalid flashcard_id" }, { status: 400 });
  }

  const svc = getSupabaseServiceClient();
  const { error } = await svc.from("flashcard_saves").insert({
    user_id: user.id,
    flashcard_id,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already_saved: true });
    }
    console.error("[flashcards/save]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const flashcard_id = searchParams.get("flashcard_id")?.trim();
  if (!flashcard_id || !isUuid(flashcard_id)) {
    return NextResponse.json({ error: "Invalid flashcard_id" }, { status: 400 });
  }

  const svc = getSupabaseServiceClient();
  const { error } = await svc.from("flashcard_saves").delete().eq("user_id", user.id).eq("flashcard_id", flashcard_id);

  if (error) {
    console.error("[flashcards/save DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
