import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase";

type MasteryBody = {
  user_id: string;
  subject: string;
  topic: string;
  subtopic: string;
  score_percent: number;
};

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<MasteryBody>;
    const { user_id, subject, topic, subtopic } = body;
    const score_percent = typeof body.score_percent === "number" ? body.score_percent : Number(body.score_percent);

    if (!user_id || !subject?.trim() || !topic?.trim() || !subtopic?.trim()) {
      return NextResponse.json({ error: "Missing user_id, subject, topic, or subtopic." }, { status: 400 });
    }
    if (!isValidUuid(user_id)) {
      return NextResponse.json({ error: "Invalid user_id." }, { status: 400 });
    }
    if (!Number.isFinite(score_percent) || score_percent < 0 || score_percent > 100) {
      return NextResponse.json({ error: "score_percent must be between 0 and 100." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
    if (!token) {
      return NextResponse.json({ error: "Authorization required." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user || authData.user.id !== user_id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const svc = getSupabaseServiceClient();
    const { data: existing } = await svc
      .from("mastery_progress")
      .select("attempts")
      .eq("user_id", user_id)
      .eq("subject", subject.trim())
      .eq("subtopic", subtopic.trim())
      .maybeSingle();

    const attempts = typeof existing?.attempts === "number" ? existing.attempts + 1 : 1;
    const mastered = score_percent >= 80;
    const now = new Date().toISOString();

    const row = {
      user_id,
      subject: subject.trim(),
      topic: topic.trim(),
      subtopic: subtopic.trim(),
      score_percent: Math.round(score_percent * 100) / 100,
      mastered,
      attempts,
      last_attempt_at: now,
    };

    const { error: upsertError } = await svc.from("mastery_progress").upsert(row, {
      onConflict: "user_id,subject,subtopic",
    });

    if (upsertError) {
      console.error("[mastery]", upsertError.message);
      return NextResponse.json({ error: "Failed to save mastery." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mastered, attempts, score_percent: row.score_percent });
  } catch (e) {
    console.error("[mastery]", e);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
