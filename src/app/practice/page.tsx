"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { startSession, updateSession } from "@/lib/studySessionClient";

type QuestionRow = {
  id: number | string;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  year: number | string | null;
  session: string | null;
  difficulty: number | null;
  marks: number | null;
};

const getSubjectBadgeColor = (subject: string | null) => {
  const normalized = (subject ?? "").toLowerCase();
  if (normalized === "mathematics" || normalized === "maths" || normalized === "math") {
    return "bg-brand-orange";
  }
  return "bg-brand-teal";
};

const toDifficulty = (value: number | null) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
};

const renderDifficultyDots = (difficulty: number) => {
  return Array.from({ length: 5 }, (_, i) => (i < difficulty ? "●" : "○")).join(" ");
};

function PracticePageContent() {
  const searchParams = useSearchParams();
  const subjectFilter = searchParams.get("subject");
  const topicFilter = searchParams.get("topic");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const status = await startSession({
          studentId: "demo-student",
          source: "practice",
          topic: topicFilter ?? undefined,
        });
        setSessionId(status.sessionId);
      } catch {
        setSessionId(null);
      }
    };
    void initSession();
  }, [topicFilter]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(() => {
      void updateSession({ sessionId, studentId: "demo-student", incrementMinutes: 1 });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError(null);

      let query = supabase.from("questions").select("*").order("id", { ascending: true });
      if (subjectFilter) {
        query = query.eq("subject", subjectFilter);
      }
      if (topicFilter) {
        query = query.eq("topic", topicFilter);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        setError(supabaseError.message);
        setQuestions([]);
      } else {
        const mapped: QuestionRow[] = (data ?? []).map((item: Record<string, unknown>) => ({
          id: (item.id as number | string) ?? "",
          subject: (item.subject as string) ?? null,
          topic: ((item.topic as string) || (item.topic_name as string)) ?? null,
          subtopic: ((item.subtopic as string) || (item.sub_topic as string)) ?? null,
          year: (item.year as number | string) ?? null,
          session:
            ((item.session as string) ||
              (item.exam_session as string) ||
              (item.paper_session as string)) ??
            null,
          difficulty: ((item.difficulty as number) || (item.difficulty_level as number)) ?? null,
          marks: ((item.marks as number) || (item.total_marks as number)) ?? null,
        }));
        setQuestions(mapped);
      }

      setIsLoading(false);
    };

    void loadQuestions();
  }, [subjectFilter, topicFilter]);

  const heading = useMemo(() => {
    if (subjectFilter && topicFilter) return `${subjectFilter} · ${topicFilter}`;
    if (topicFilter) return `${topicFilter} questions`;
    if (!subjectFilter) return "All practice questions";
    return `${subjectFilter} practice questions`;
  }, [subjectFilter, topicFilter]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <h1 className="heading-font text-3xl font-bold text-slate-900">{heading}</h1>

      {isLoading && <p className="mt-4 text-sm text-slate-600">Loading questions...</p>}
      {error && <p className="mt-4 text-sm text-red-600">Failed to load questions: {error}</p>}
      {!isLoading && !error && questions.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">No questions found for this subject.</p>
      )}

      <section className="mt-5 space-y-3">
        {questions.map((question) => {
          const difficulty = toDifficulty(question.difficulty);
          const subject = question.subject ?? "Unknown";
          const topic = question.topic ?? "General";
          const subtopic = question.subtopic ?? "General";
          const sessionYear = [question.session, question.year].filter(Boolean).join(" ");
          const marks = question.marks ?? 1;

          return (
            <article
              key={String(question.id)}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:shadow-lg"
            >
              <span
                className={`inline-block rounded-full px-2 py-1 text-xs font-semibold text-white ${getSubjectBadgeColor(subject)}`}
              >
                {subject}
              </span>

              <p className="mt-2 text-lg font-semibold text-slate-900">{topic}</p>
              <p className="text-sm text-slate-600">Subtopic: {subtopic}</p>
              <p className="mt-1 text-sm text-slate-500">{sessionYear || "Session not specified"}</p>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{renderDifficultyDots(difficulty)}</p>
                  <p className="text-xs text-slate-500">{marks} marks</p>
                </div>

                <Link
                  href={`/question?id=${encodeURIComponent(String(question.id))}`}
                  className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Attempt
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PracticePageContent />
    </Suspense>
  );
}
