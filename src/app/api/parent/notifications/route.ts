import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import * as Sentry from "@sentry/nextjs";

const demo = [
  {
    id: "1",
    type: "session_missed",
    message: "Ahmed missed his scheduled study session window (7:00 PM - 9:00 PM).",
    sent_at: new Date().toISOString(),
    read: false,
  },
  {
    id: "2",
    type: "session_complete",
    message: "Ahmed completed today’s session: 24 minutes, 8 questions, 75% accuracy.",
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
];

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("parent_id", "demo-parent")
      .order("sent_at", { ascending: false });
    return NextResponse.json({ notifications: (data?.length ? data : demo) });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({ notifications: demo });
  }
}

export async function PATCH() {
  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("notifications").update({ read: true }).eq("parent_id", "demo-parent");
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Failed to mark notifications read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
