import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type NotifyBody = {
  parentId?: string;
  studentId?: string;
  type?: "session_missed" | "session_started" | "session_complete" | "struggling" | "streak_broken";
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifyBody;
    const parentId = String(body.parentId ?? "");
    const studentId = String(body.studentId ?? "");
    const type = String(body.type ?? "");
    const message = String(body.message ?? "");
    if (!parentId || !studentId || !type || !message) {
      return NextResponse.json({ error: "parentId, studentId, type, message are required." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    await supabase.from("notifications").insert({
      parent_id: parentId,
      student_id: studentId,
      type,
      message,
      sent_at: new Date().toISOString(),
      read: false,
    });

    console.log(`[notify] ${type} -> parent ${parentId}: ${message}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
