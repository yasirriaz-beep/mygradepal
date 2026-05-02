import { NextResponse } from "next/server";

import { isFlashcardCommandWord } from "@/lib/flashcards";
import { getAuthUserFromRequest } from "@/lib/getAuthUserFromRequest";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    front?: string;
    back?: string;
    hint?: string;
    chapter?: string;
    subtopic?: string;
    command_word?: string;
    tier?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const front = body.front?.trim();
  const back = body.back?.trim();
  const chapter = body.chapter?.trim();
  const command_word = body.command_word?.trim() ?? "State";

  if (!front || !back || !chapter) {
    return NextResponse.json({ error: "front, back, and chapter (topic) are required." }, { status: 400 });
  }

  if (!isFlashcardCommandWord(command_word)) {
    return NextResponse.json({ error: "Invalid command_word." }, { status: 400 });
  }

  const tier = typeof body.tier === "number" && [1, 2, 3].includes(body.tier) ? body.tier : 1;

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("flashcards")
    .insert({
      subject: "Chemistry",
      chapter,
      subtopic: body.subtopic?.trim() || null,
      front,
      back,
      hint: body.hint?.trim() || null,
      command_word,
      tier,
      is_platform: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[flashcards/custom]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    id?: string;
    front?: string;
    back?: string;
    hint?: string;
    chapter?: string;
    subtopic?: string;
    command_word?: string;
    tier?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const svc = getSupabaseServiceClient();
  const { data: row, error: fetchErr } = await svc.from("flashcards").select("id, created_by, is_platform").eq("id", id).maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.created_by !== user.id || row.is_platform) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (body.front !== undefined) patch.front = body.front.trim();
  if (body.back !== undefined) patch.back = body.back.trim();
  if (body.hint !== undefined) patch.hint = body.hint.trim() || null;
  if (body.chapter !== undefined) patch.chapter = body.chapter.trim();
  if (body.subtopic !== undefined) patch.subtopic = body.subtopic.trim() || null;
  if (body.command_word !== undefined) {
    const cw = body.command_word.trim();
    if (!isFlashcardCommandWord(cw)) {
      return NextResponse.json({ error: "Invalid command_word." }, { status: 400 });
    }
    patch.command_word = cw;
  }
  if (body.tier !== undefined && [1, 2, 3].includes(Number(body.tier))) patch.tier = body.tier;

  const { error } = await svc.from("flashcards").update(patch).eq("id", id);

  if (error) {
    console.error("[flashcards/custom PATCH]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const svc = getSupabaseServiceClient();
  const { data: row, error: fetchErr } = await svc.from("flashcards").select("id, created_by, is_platform").eq("id", id).maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.created_by !== user.id || row.is_platform) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await svc.from("flashcards").delete().eq("id", id);

  if (error) {
    console.error("[flashcards/custom DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
