"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type MarkingResult = {
  marks_awarded: number;
  total_marks: number;
  feedback: string;
  hint: string;
};

type QuestionRow = {
  id: string | number;
  question_text: string | null;
  subject: string | null;
  topic: string | null;
};

type McqOption = {
  key: string;
  text: string;
};

const MCQ_PATTERN = /([A-D])\.\s*([\s\S]*?)(?=(?:\s+[A-D]\.\s)|$)/g;

const parseQuestionForMcq = (questionText: string) => {
  const options: McqOption[] = [];
  let match: RegExpExecArray | null = null;

  while ((match = MCQ_PATTERN.exec(questionText)) !== null) {
    const key = match[1];
    const text = match[2].replace(/\s+/g, " ").trim();
    if (text) {
      options.push({ key, text });
    }
  }

  if (options.length < 2) {
    return { stem: questionText, options: [] as McqOption[] };
  }

  const firstOptionMarker = questionText.search(/\bA\.\s/);
  const stem = firstOptionMarker > 0 ? questionText.slice(0, firstOptionMarker).trim() : questionText;

  return { stem, options };
};

function QuestionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get("id");
  const [answer, setAnswer] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [question, setQuestion] = useState<QuestionRow | null>(null);
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const studentId = "demo-student";

  useEffect(() => {
    const loadQuestion = async () => {
      setIsLoadingQuestion(true);
      setError(null);
      setResult(null);
      setAnswer("");

      if (!questionId) {
        setError("Missing question id in URL.");
        setQuestion(null);
        setIsLoadingQuestion(false);
        return;
      }

      const { data, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", questionId)
        .single();

      if (questionError || !data) {
        setError(questionError?.message ?? "Question not found.");
        setQuestion(null);
      } else {
        setQuestion({
          id: (data.id as string | number) ?? questionId,
          question_text: (data.question_text as string) ?? (data.question as string) ?? "",
          subject: (data.subject as string) ?? null,
          topic: (data.topic as string) ?? (data.topic_name as string) ?? null,
        });
      }

      setIsLoadingQuestion(false);
    };

    void loadQuestion();
  }, [questionId]);

  const markAnswer = async (studentAnswer: string) => {
    return fetch("/api/mark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId,
        studentAnswer,
        studentId,
      }),
    });
  };

  const handleSubmit = async () => {
    if (!questionId) {
      setError("Missing question id.");
      return;
    }

    if (!answer.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }

    setError(null);
    setResult(null);
    setIsMarking(true);

    try {
      const response = await markAnswer(answer);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Marking failed.");
      }

      setResult(data as MarkingResult);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Something went wrong while marking.";
      setError(message);
    } finally {
      setIsMarking(false);
    }
  };

  const [whatWasCorrect, whatWasMissed] = useMemo(() => {
    if (!result?.feedback) {
      return ["", ""];
    }
    const parts = result.feedback
      .split(".")
      .map((part) => part.trim())
      .filter(Boolean);
    return [parts[0] ?? "Good attempt.", parts.slice(1).join(". ") || result.feedback];
  }, [result]);

  const questionText = question?.question_text ?? "";
  const mcqData = useMemo(() => parseQuestionForMcq(questionText), [questionText]);
  const isMcq = mcqData.options.length > 0;
  const displayedQuestion = isMcq ? mcqData.stem : questionText;

  const handleTryAnotherQuestion = () => {
    router.push("/practice");
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <p className="text-sm text-slate-500">
          {(question?.subject ?? "Subject")} &gt; {(question?.topic ?? "Topic")}
        </p>

        <h1 className="heading-font mt-3 text-2xl font-bold text-slate-900">
          {displayedQuestion || "Loading question..."}
        </h1>

        {isMcq ? (
          <fieldset className="mt-6">
            <legend className="block text-sm font-medium text-slate-700">Select one answer</legend>
            <div className="mt-3 space-y-2">
              {mcqData.options.map((option) => {
                const optionValue = `${option.key}. ${option.text}`;
                return (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-teal"
                  >
                    <input
                      type="radio"
                      name="mcq-answer"
                      value={optionValue}
                      checked={answer === optionValue}
                      onChange={(event) => setAnswer(event.target.value)}
                      className="mt-1 h-4 w-4 accent-brand-teal"
                    />
                    <span className="text-sm text-slate-800">
                      <span className="font-semibold">{option.key}.</span> {option.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <>
            <label htmlFor="studentAnswer" className="mt-6 block text-sm font-medium text-slate-700">
              Your answer
            </label>
            <textarea
              id="studentAnswer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write your explanation here..."
              className="mt-2 h-40 w-full rounded-xl border border-teal-100 p-3 text-slate-900 outline-none ring-brand-teal transition focus:ring-2"
            />
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={isMarking || isLoadingQuestion || !question}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isMarking && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isMarking ? "Marking..." : "Submit answer"}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {isLoadingQuestion && <p className="mt-3 text-sm text-slate-600">Loading question...</p>}
      </div>

      {result && (
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="heading-font text-4xl font-bold text-brand-teal">
            {result.marks_awarded} / {result.total_marks} marks
          </h2>

          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-700">What you got right</p>
              <p className="mt-1 text-slate-800">{whatWasCorrect}</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="font-semibold text-orange-700">What was missed</p>
              <p className="mt-1 text-slate-800">{whatWasMissed}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="font-semibold text-sky-700">Tip to improve</p>
              <p className="mt-1 text-slate-800">{result.hint}</p>
            </div>
          </div>

          <button
            onClick={handleTryAnotherQuestion}
            className="mt-5 w-full rounded-xl bg-brand-teal px-4 py-4 text-lg font-semibold text-white transition hover:opacity-90"
          >
            Try another question
          </button>
        </section>
      )}
    </main>
  );
}

export default function QuestionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuestionPageContent />
    </Suspense>
  );
}
