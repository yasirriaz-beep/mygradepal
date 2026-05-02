"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CHEMISTRY_TOPICS, topicDisplayName } from "@/lib/topics";
import type { DifficultyFilter, ExamModeType, ExamSetupPayload, QuestionCountChoice, YearFilter } from "@/lib/examTypes";
import { fetchExamQuestionPool, pickQuestionsForExam } from "@/lib/fetchExamQuestions";
import { BRAND_TEAL, EXAM_SESSION_KEY } from "@/lib/examUtils";

export default function ExamSetupPage() {
  const router = useRouter();
  const [topicValue, setTopicValue] = useState<"all" | string>("all");
  const [countChoice, setCountChoice] = useState<QuestionCountChoice>(20);
  const [mode, setMode] = useState<ExamModeType>("practice");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topicLabel = useMemo(() => {
    if (topicValue === "all") return "All topics";
    return topicValue;
  }, [topicValue]);

  const startExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const pool = await fetchExamQuestionPool({
        topicValue,
        difficulty,
        yearFilter,
      });

      if (pool.length === 0) {
        setError("No questions match these filters. Try widening topic or year.");
        setLoading(false);
        return;
      }

      const picked = pickQuestionsForExam(pool, countChoice);
      if (picked.length === 0) {
        setError("Could not build an exam from this pool.");
        setLoading(false);
        return;
      }

      const setup: ExamSetupPayload = {
        topic: topicLabel,
        topicValue,
        countChoice,
        mode,
        difficulty,
        yearFilter,
      };

      const payload = {
        setup,
        questions: picked,
        preparedAt: Date.now(),
      };

      sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(payload));
      router.push("/exam/session");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  const cardBase =
    "cursor-pointer rounded-2xl border-2 p-4 text-left transition hover:shadow-md md:p-5";
  const cardInactive = "border-slate-200 bg-white";
  const cardActive = "border-[#189080] bg-teal-50/80 shadow-card";

  return (
    <main className="min-h-screen bg-teal-50/60 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <Link href="/practice" className="text-sm font-medium text-slate-600 hover:text-[#189080]">
            ← Back to practice
          </Link>
          <h1 className="heading-font mt-4 text-3xl font-bold text-slate-900">Exam mode</h1>
          <p className="mt-2 text-slate-600">Configure your session, then start.</p>
        </header>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topic</label>
          <select
            value={topicValue}
            onChange={(e) => setTopicValue(e.target.value as "all" | string)}
            className="body-font w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-[#189080] focus:outline-none focus:ring-2 focus:ring-[#189080]/30"
          >
            <option value="all">All topics</option>
            {CHEMISTRY_TOPICS.map((t) => (
              <option key={t} value={t}>
                {topicDisplayName(t)}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Number of questions</label>
          <select
            value={String(countChoice)}
            onChange={(e) => {
              const v = e.target.value;
              setCountChoice(v === "all" ? "all" : (Number(v) as 10 | 20 | 40));
            }}
            className="body-font w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-[#189080] focus:outline-none focus:ring-2 focus:ring-[#189080]/30"
          >
            <option value="10">10 questions (quick practice)</option>
            <option value="20">20 questions (standard)</option>
            <option value="40">40 questions (extended)</option>
            <option value="all">All questions for selected topic</option>
          </select>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</p>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("practice")}
              className={`${cardBase} ${mode === "practice" ? cardActive : cardInactive}`}
            >
              <p className="heading-font text-lg font-semibold text-slate-900">Practice mode</p>
              <ul className="body-font mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                <li>No timer</li>
                <li>Hints available</li>
                <li>Review after each question</li>
              </ul>
            </button>
            <button
              type="button"
              onClick={() => setMode("exam")}
              className={`${cardBase} ${mode === "exam" ? cardActive : cardInactive}`}
            >
              <p className="heading-font text-lg font-semibold text-slate-900">Exam simulation</p>
              <ul className="body-font mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                <li>Timed (1.5 min per mark total)</li>
                <li>No hints</li>
                <li>Results focused per question after submit</li>
              </ul>
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
              className="body-font w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-[#189080] focus:outline-none focus:ring-2 focus:ring-[#189080]/30"
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy only</option>
              <option value="medium">Medium only</option>
              <option value="hard">Hard only</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value as YearFilter)}
              className="body-font w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-[#189080] focus:outline-none focus:ring-2 focus:ring-[#189080]/30"
            >
              <option value="all">All years</option>
              <option value="5y">Last 5 years (2020–2025)</option>
              <option value="3y">Last 3 years (2022–2025)</option>
            </select>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => void startExam()}
          className="body-font w-full rounded-xl py-4 text-base font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-60"
          style={{ backgroundColor: BRAND_TEAL }}
        >
          {loading ? "Preparing…" : "Start exam"}
        </button>
      </div>
    </main>
  );
}
