import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyReport } from "@/lib/weeklyReport";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const week = request.nextUrl.searchParams.get("week") ?? undefined;
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id param" }, { status: 400 });
    }

    const report = await buildWeeklyReport(userId, week);
    return NextResponse.json(report);
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    return NextResponse.json({ error: "Failed to build weekly report" }, { status: 500 });
  }
}
