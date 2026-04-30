import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { getSupabaseServiceClient } from "@/lib/supabase";

type Body = {
  studentId?: string;
  subject?: string;
  entry?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const studentId = String(body.studentId ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const entry = body.entry;

    if (!studentId || !subject) {
      return NextResponse.json({ error: "studentId and subject are required." }, { status: 400 });
    }
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "entry must be a JSON object." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.rpc("append_edit_history", {
      p_student_id: studentId,
      p_subject: subject,
      p_entry: entry,
    });

    if (error) {
      console.error("[study-plan/edit] append_edit_history failed:", error.message, error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    Sentry.captureException(e, { tags: { component: "question_import" } });
    const message = e instanceof Error ? e.message : "Failed to record edit.";
    console.error("[study-plan/edit] unexpected:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
