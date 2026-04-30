type MarkAnswerInput = {
  questionText: string;
  markScheme: string;
  studentAnswer: string;
  subject: string;
  topic: string;
};

type MarkAnswerResult = {
  marks_awarded: number;
  total_marks: number;
  feedback: string;
  hint: string;
};

type MockQuestion = {
  question_number: number;
  question_text: string;
  marks: number;
  mark_scheme: string;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function markAnswer({
  questionText,
  markScheme,
  studentAnswer,
  subject,
  topic,
}: MarkAnswerInput): Promise<MarkAnswerResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system:
        "You are an IGCSE examiner. You must respond with ONLY a JSON object, no other text. The JSON must have exactly these fields: marks_awarded (number), total_marks (number), feedback (string), hint (string)",
      messages: [
        {
          role: "user",
          content: `Subject: ${subject}
Topic: ${topic}
Question:
${questionText}

Mark scheme:
${markScheme}

Student answer:
${studentAnswer}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const textBlock = data?.content?.find((item: { type?: string }) => item.type === "text");
  const responseText = textBlock?.text;

  if (!responseText) {
    throw new Error("Anthropic response did not contain text content.");
  }

  const text = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(text) as MarkAnswerResult;
  } catch (parseError) {
    console.error("Failed to parse Anthropic JSON response:", responseText, parseError);
    throw new Error("Anthropic response was not valid JSON.");
  }
}

export async function generatePredictedPaper(subject: string, topics: string[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  }

  const userPrompt = `Generate a 40-mark IGCSE mock exam paper for ${subject}. Include 4 questions worth 10 marks each. Format each question clearly with mark allocations in brackets. Base questions on these likely exam topics: ${topics.join(
    ", ",
  )}. Return plain text only, no markdown.`;

  const requestBody = {
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  };

  console.log("[Anthropic] generatePredictedPaper request:", JSON.stringify(requestBody));

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.content?.find((item: { type?: string }) => item.type === "text")?.text;
  if (!responseText) {
    throw new Error("Anthropic response did not contain text content.");
  }

  return responseText.replace(/```/g, "").trim();
}

export async function markMockAnswer(input: {
  questionText: string;
  markScheme: string;
  studentAnswer: string;
  subject: string;
}): Promise<MarkAnswerResult> {
  return markAnswer({
    questionText: input.questionText,
    markScheme: input.markScheme,
    studentAnswer: input.studentAnswer,
    subject: input.subject,
    topic: "Predicted Paper",
  });
}
