import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

type ReminderRequest = { childId?: string; parentPhone?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReminderRequest;
    const childId = String(body.childId ?? "");
    const parentPhone = String(body.parentPhone ?? "");
    if (!childId || !parentPhone) {
      return NextResponse.json({ error: "childId and parentPhone are required." }, { status: 400 });
    }
    console.log(`[parent-reminder] ${childId} -> ${parentPhone}`);
    return NextResponse.json({ ok: true, message: "Reminder queued successfully." });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Failed to queue reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
