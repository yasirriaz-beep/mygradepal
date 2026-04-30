import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { getSupabaseServiceClient } from "@/lib/supabase";

type TutorSessionBody = {
  studentId: string;
  subject: string;
  topic: string;
  messageCount: number;
  startedAt: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TutorSessionBody;
    const { studentId, subject, topic, messageCount, startedAt } = body;

    if (!studentId || !subject || !topic) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("tutor_sessions").insert({
      student_id: studentId,
      subject,
      topic,
      message_count: messageCount ?? 0,
      started_at: startedAt ?? new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Failed to save tutor session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
