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
  subtopic: string | null;
  difficulty: string | null;
  marks: number | null;
  paper_type: string | null;
};

type McqOption = {
  key: string;
  text: string;
};

const MCQ_PATTERN = /([A-D])\.\s*([\s\S]*?)(?=(?:\s+[A-D]\.\s)|$)/g;
const TEAL = "#189080";
const QUESTION_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  mcq: { bg: "#E1F5EE", text: "#0F6E56" },
  theory: { bg: "#EEEDFE", text: "#3C3489" },
  practical: { bg: "#FAECE7", text: "#712B13" },
};
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: "#EAF3DE", text: "#27500A" },
  medium: { bg: "#FAEEDA", text: "#633806" },
  hard: { bg: "#FCEBEB", text: "#791F1F" },
};

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
  const indexParam = Number(searchParams.get("index") ?? "1");
  const totalParam = Number(searchParams.get("total") ?? "1");
  const returnTo = searchParams.get("returnTo") ?? "/practice";
  const [answer, setAnswer] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [question, setQuestion] = useState<QuestionRow | null>(null);
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const studentId = "demo-student";

  const safeTotal = Number.isFinite(totalParam) && totalParam > 0 ? totalParam : 1;
  const currentIndex = Math.min(Math.max(Number.isFinite(indexParam) ? indexParam : 1, 1), safeTotal);
  const progressPct = Math.max(0, Math.min(100, (currentIndex / safeTotal) * 100));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("practice_question_ids");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setQuestionIds(parsed.map((id) => String(id)));
      }
    } catch {
      setQuestionIds([]);
    }
  }, []);

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
          subtopic: (data.subtopic as string) ?? null,
          difficulty: (data.difficulty as string) ?? null,
          marks: (data.marks as number) ?? null,
          paper_type: (data.paper_type as string) ?? null,
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

  const handleBackToPractice = () => {
    router.push(returnTo);
  };

  const navigateToIndex = (targetIndex: number) => {
    if (targetIndex < 1) return;
    if (targetIndex > safeTotal) {
      handleBackToPractice();
      return;
    }
    if (!questionIds.length) {
      if (targetIndex === currentIndex) return;
      if (targetIndex > safeTotal) {
        handleBackToPractice();
      }
      return;
    }
    const targetId = questionIds[targetIndex - 1];
    if (!targetId) {
      handleBackToPractice();
      return;
    }
    router.push(
      `/question?id=${encodeURIComponent(targetId)}&index=${targetIndex}&total=${safeTotal}&returnTo=${encodeURIComponent(returnTo)}`,
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-3 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToPractice}
            style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}
            className="rounded-lg px-2 py-1 hover:bg-slate-100"
          >
            ← Back
          </button>
          <p className="text-sm font-semibold text-slate-700">
            Question {currentIndex} of {safeTotal}
          </p>
          <span className="w-14" />
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${progressPct}%`, background: TEAL, transition: "width 0.2s ease" }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-2 flex items-center gap-2">
          {(() => {
            const typeKey = (question?.paper_type ?? (isMcq ? "MCQ" : "Theory")).toLowerCase();
            const typeStyle = QUESTION_TYPE_COLORS[typeKey] ?? QUESTION_TYPE_COLORS.mcq;
            const diffKey = (question?.difficulty ?? "medium").toLowerCase();
            const diffStyle = DIFFICULTY_COLORS[diffKey] ?? DIFFICULTY_COLORS.medium;
            return (
              <>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: typeStyle.text,
                    background: typeStyle.bg,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  {question?.paper_type ?? (isMcq ? "MCQ" : "Theory")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: diffStyle.text,
                    background: diffStyle.bg,
                    borderRadius: 6,
                    padding: "2px 8px",
                    textTransform: "capitalize",
                  }}
                >
                  {question?.difficulty ?? "medium"}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {(question?.marks ?? 1)} mark{(question?.marks ?? 1) !== 1 ? "s" : ""}
                </span>
              </>
            );
          })()}
        </div>
        <p className="text-sm text-slate-500">
          {(question?.subject ?? "Subject")} &gt; {(question?.topic ?? "Topic")}
        </p>
        <p className="mt-1 text-xs text-slate-400">{question?.subtopic ?? "Subtopic"}</p>

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

        {!result && (
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
        )}

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

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => navigateToIndex(currentIndex - 1)}
              disabled={currentIndex <= 1}
              className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Previous
            </button>
            {currentIndex >= safeTotal ? (
              <button
                type="button"
                onClick={handleBackToPractice}
                className="w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Finish session →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateToIndex(currentIndex + 1)}
                className="w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Next question →
              </button>
            )}
          </div>
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
