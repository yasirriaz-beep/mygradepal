"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import BottomNav from "@/components/BottomNav";

type MockQuestion = {
  question_number: number;
  question_text: string;
  marks: number;
  mark_scheme: string;
};

type MockPaperPayload = {
  subject: string;
  paper?: {
    title: string;
    instructions: string;
    total_marks: number;
    questions: MockQuestion[];
  };
  paperText?: string;
};

type MarkingResult = {
  marks_awarded: number;
  total_marks: number;
  feedback: string;
  hint: string;
};

function MockPaperPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject") ?? "Chemistry";
  const [payload, setPayload] = useState<MockPaperPayload | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, MarkingResult>>({});
  const [loadingQuestion, setLoadingQuestion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("generatedMockPaper");
    if (!stored) {
      setError("No generated paper found. Please generate one from SmartPredict.");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as MockPaperPayload;
      setPayload(parsed);
    } catch {
      setError("Could not read generated paper data.");
    }
  }, []);

  const handleMark = async (question: MockQuestion) => {
    const studentAnswer = answers[question.question_number]?.trim();
    if (!studentAnswer) return;

    setLoadingQuestion(question.question_number);
    setError(null);

    try {
      const response = await fetch("/api/mark-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          questionText: question.question_text,
          markScheme: question.mark_scheme,
          studentAnswer,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to mark answer.");
      }
      setResults((prev) => ({ ...prev, [question.question_number]: data as MarkingResult }));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Failed to mark this question.";
      setError(message);
    } finally {
      setLoadingQuestion(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h1 className="heading-font text-3xl font-bold text-slate-900">
          {payload?.paper?.title ?? "Generated Mock Paper"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {payload?.paper?.instructions ?? "Answer all questions."}
        </p>
        <p className="mt-1 text-sm font-medium text-brand-teal">
          Total marks: {payload?.paper?.total_marks ?? 40}
        </p>
      </div>

      {payload?.paperText && (
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="heading-font text-xl font-semibold text-slate-900">Generated Paper</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{payload.paperText}</pre>
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-5 space-y-4">
        {payload?.paper?.questions?.map((question) => {
          const result = results[question.question_number];
          return (
            <article key={question.question_number} className="rounded-2xl bg-white p-5 shadow-card">
              <h2 className="font-semibold text-slate-900">
                Q{question.question_number}. {question.question_text} ({question.marks} marks)
              </h2>
              <textarea
                value={answers[question.question_number] ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, [question.question_number]: event.target.value }))
                }
                placeholder="Write your answer..."
                className="mt-3 h-32 w-full rounded-xl border border-teal-100 p-3 text-sm text-slate-900 outline-none ring-brand-teal transition focus:ring-2"
              />

              <button
                onClick={() => handleMark(question)}
                disabled={loadingQuestion === question.question_number}
                className="mt-3 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
              >
                {loadingQuestion === question.question_number ? "Marking..." : "Mark answer"}
              </button>

              {result && (
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
                  <p className="font-semibold text-brand-teal">
                    Score: {result.marks_awarded}/{result.total_marks}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{result.feedback}</p>
                  <p className="mt-1 text-sm text-slate-600">Hint: {result.hint}</p>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <button
        onClick={() => router.push("/predict")}
        className="mt-6 w-full rounded-xl bg-brand-teal px-4 py-3 font-semibold text-white"
      >
        Back to SmartPredict
      </button>

      <BottomNav />
    </main>
  );
}

export default function MockPaperPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MockPaperPageContent />
    </Suspense>
  );
}
