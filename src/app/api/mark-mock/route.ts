import { NextResponse } from "next/server";

import { markMockAnswer } from "@/lib/claude";

type MarkMockBody = {
  subject: string;
  questionText: string;
  markScheme: string;
  studentAnswer: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MarkMockBody;
    const { subject, questionText, markScheme, studentAnswer } = body;

    if (!subject || !questionText || !markScheme || !studentAnswer) {
      return NextResponse.json(
        { error: "Missing required fields: subject, questionText, markScheme, studentAnswer" },
        { status: 400 },
      );
    }

    const result = await markMockAnswer({
      subject,
      questionText,
      markScheme,
      studentAnswer,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark mock answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
