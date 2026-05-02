"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ExamResultsPayload } from "@/lib/examTypes";
import { EXAM_RESULTS_KEY } from "@/lib/examUtils";
import { topicContentSubtopicKey } from "@/lib/topicContentSubtopic";
import { supabase } from "@/lib/supabase";

const BRAND_TEAL = "#189080";

export default function ExamResultsPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ExamResultsPayload | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(EXAM_RESULTS_KEY);
    if (!raw) {
      router.replace("/exam");
      return;
    }
    try {
      setPayload(JSON.parse(raw) as ExamResultsPayload);
    } catch {
      router.replace("/exam");
    }
  }, [router]);

  useEffect(() => {
    if (!payload || savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const timeTaken = Math.round((payload.endedAt - payload.startedAt) / 1000);
      const { error } = await supabase.from("exam_results").insert({
        user_id: user.id,
        topic: payload.setup.topic,
        questions_count: payload.items.length,
        score_marks: payload.scoreMarks,
        total_marks: payload.totalMarks,
        score_percent: Math.round(payload.scorePercent * 100) / 100,
        grade: payload.grade,
        time_taken_seconds: timeTaken,
        weak_topics: payload.weakTopics,
        mode: payload.setup.mode,
      });
      if (error) console.warn("[exam-results] save failed", error.message);
    })();
  }, [payload]);

  const topicBreakdown = useMemo(() => {
    if (!payload) return [];
    const map = new Map<string, { correct: number; total: number }>();
    for (const it of payload.items) {
      const t = it.question.topic || "Other";
      const cur = map.get(t) ?? { correct: 0, total: 0 };
      cur.total += 1;
      if (it.selfMark === "full") cur.correct += 1;
      else if (it.selfMark === "partial") cur.correct += 0.5;
      map.set(t, cur);
    }
    return [...map.entries()].map(([topic, v]) => ({
      topic,
      pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
      weak: v.total ? v.correct / v.total < 0.5 : false,
    }));
  }, [payload]);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-teal-50/60 text-slate-600">
        Loading results…
      </div>
    );
  }

  const pctRounded = Math.round(payload.scorePercent);
  const timed = payload.setup.mode === "exam";
  const seconds = Math.round((payload.endedAt - payload.startedAt) / 1000);

  return (
    <main className="min-h-screen bg-teal-50/40 px-4 py-8 body-font md:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-[#189080]">
          ← Dashboard
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-6 flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#189080] bg-teal-50">
            <div>
              <p className="heading-font text-4xl font-bold text-slate-900">{pctRounded}%</p>
              <p className="text-sm font-semibold text-[#189080]">{payload.grade}</p>
            </div>
          </div>
          <p className="text-lg text-slate-700">
            <span className="font-semibold text-slate-900">
              {payload.scoreMarks} out of {payload.totalMarks} marks
            </span>
          </p>
          {timed && (
            <p className="mt-2 text-sm text-slate-500">
              Time taken: {Math.floor(seconds / 60)}m {seconds % 60}s
            </p>
          )}
        </section>

        <section>
          <h2 className="heading-font mb-3 text-lg font-semibold text-slate-900">Grade boundaries</h2>
          <div className="relative h-10 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="absolute inset-0 flex text-[10px] font-medium text-white">
              <span className="flex flex-1 items-center justify-center bg-violet-600/90">A*</span>
              <span className="flex flex-1 items-center justify-center bg-blue-600/90">A</span>
              <span className="flex flex-1 items-center justify-center bg-emerald-600/90">B</span>
              <span className="flex flex-1 items-center justify-center bg-teal-600/90">C</span>
              <span className="flex flex-1 items-center justify-center bg-amber-500/90">D</span>
              <span className="flex flex-1 items-center justify-center bg-orange-600/90">E</span>
              <span className="flex flex-1 items-center justify-center bg-red-600/90">U</span>
            </div>
            <div
              className="absolute bottom-0 top-0 w-1 bg-slate-900 shadow"
              style={{ left: `calc(${Math.min(100, Math.max(0, pctRounded))}% - 2px)` }}
              title="Your score"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            A*: 90%+ · A: 80%+ · B: 70%+ · C: 60%+ · D: 50%+ · E: 40%+ · U: below 40%
          </p>
        </section>

        <section>
          <h2 className="heading-font mb-4 text-lg font-semibold text-slate-900">Topic breakdown</h2>
          <div className="space-y-3">
            {topicBreakdown.map((row) => (
              <div key={row.topic}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={row.weak ? "font-semibold text-red-700" : "text-slate-800"}>{row.topic}</span>
                  <span className="tabular-nums text-slate-600">{row.pct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${row.weak ? "bg-red-400" : "bg-[#189080]"}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="heading-font mb-4 text-lg font-semibold text-slate-900">Question review</h2>
          <div className="space-y-4">
            {payload.items.map((it, idx) => {
              const badge =
                it.selfMark === "full"
                  ? { label: "Got it", cls: "bg-emerald-100 text-emerald-800" }
                  : it.selfMark === "partial"
                    ? { label: "Partial", cls: "bg-amber-100 text-amber-800" }
                    : { label: "Wrong", cls: "bg-red-100 text-red-800" };
              const tutorTopic = topicContentSubtopicKey(it.question.subtopic || it.question.topic);
              return (
                <div key={it.question.id + idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-700">{it.question.question_text}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Your answer:{" "}
                    <span className="font-medium text-slate-800">
                      {it.selectedMcq ? `Option ${it.selectedMcq}` : it.textAnswer || "—"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Mark scheme: <span className="text-slate-700">{it.question.mark_scheme?.slice(0, 200) ?? "—"}…</span>
                  </p>
                  <Link
                    href={`/tutor?subject=Chemistry&topic=${encodeURIComponent(tutorTopic)}`}
                    className="mt-3 inline-block text-sm font-semibold text-[#189080] underline underline-offset-2"
                  >
                    Ask tutor
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-3 pb-12">
          <Link
            href="/exam"
            className="block w-full rounded-xl py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND_TEAL }}
          >
            Retake exam
          </Link>
          <Link
            href={
              payload.weakTopics[0]
                ? `/practice?topic=${encodeURIComponent(payload.weakTopics[0])}`
                : "/practice"
            }
            className="block w-full rounded-xl border-2 border-[#189080] py-3 text-center text-sm font-semibold text-[#189080]"
          >
            Practice weak topics
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
