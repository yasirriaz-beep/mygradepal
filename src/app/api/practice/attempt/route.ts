import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  try {
    const { user_id, question_id, result } = (await req.json()) as {
      user_id: string;
      question_id: string;
      result: "got_it" | "close" | "missed";
    };

    if (!user_id || !question_id || !result) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    // Best-effort table bootstrap for new environments.
    await supabase.rpc("exec_sql", {
      sql_query: `
        create table if not exists public.user_attempts (
          id bigserial primary key,
          user_id text not null,
          question_id text not null,
          result text not null check (result in ('got_it','close','missed')),
          attempted_at timestamptz not null default now()
        );
      `,
    });

    const { error } = await supabase.from("user_attempts").insert({
      user_id,
      question_id,
      result,
      attempted_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await updateStreak(user_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({ error: "Failed to save attempt." }, { status: 500 });
  }
}
