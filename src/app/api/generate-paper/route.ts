import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { generatePredictedPaper } from "@/lib/claude";

type GeneratePaperBody = {
  subject?: string;
};

const TOP_TOPICS_BY_SUBJECT: Record<string, string[]> = {
  Chemistry: ["Stoichiometry", "Organic Chemistry", "Acids, Bases and Salts"],
  Physics: ["Forces and Motion", "Electricity", "Waves"],
  Mathematics: ["Algebra", "Coordinate Geometry", "Trigonometry"],
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeneratePaperBody;
    const subject = body.subject ?? "Chemistry";
    const topics = TOP_TOPICS_BY_SUBJECT[subject] ?? TOP_TOPICS_BY_SUBJECT.Chemistry;

    try {
      const paperText = await generatePredictedPaper(subject, topics);
      return NextResponse.json({
        subject,
        topics,
        paperText,
      });
    } catch (anthropicError) {
      Sentry.captureException(anthropicError, { tags: { component: "question_import" } });
      const anthropicMessage =
        anthropicError instanceof Error
          ? anthropicError.message
          : "Unknown Anthropic error during paper generation.";
      return NextResponse.json(
        { error: `Anthropic generation failed: ${anthropicMessage}` },
        { status: 500 },
      );
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "question_import" } });
    const message = error instanceof Error ? error.message : "Failed to generate paper.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
