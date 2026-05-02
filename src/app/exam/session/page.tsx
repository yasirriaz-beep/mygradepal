"use client";

import { useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ExamQuestionRow, ExamQuestionState, ExamResultsPayload, ExamSetupPayload, SelfMark } from "@/lib/examTypes";
import {
  BRAND_ORANGE,
  BRAND_TEAL,
  cambridgeGrade,
  EXAM_RESULTS_KEY,
  EXAM_SESSION_KEY,
  isMcqQuestion,
  parseMcqOptions,
  totalTimerSeconds,
} from "@/lib/examUtils";

type SessionStored = {
  setup: ExamSetupPayload;
  questions: ExamQuestionRow[];
  preparedAt: number;
};

function emptyState(): ExamQuestionState {
  return {
    textAnswer: "",
    selectedMcq: null,
    flagged: false,
    submitted: false,
    selfMark: null,
    hintRevealed: false,
  };
}

function awardedForSelfMark(marks: number, sm: SelfMark): number {
  if (sm === "full") return marks;
  if (sm === "partial") return Math.max(0, Math.round(marks / 2));
  if (sm === "zero") return 0;
  return 0;
}

export default function ExamSessionPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [setup, setSetup] = useState<ExamSetupPayload | null>(null);
  const [questions, setQuestions] = useState<ExamQuestionRow[]>([]);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [states, setStates] = useState<ExamQuestionState[]>([]);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const examTimerStarted = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(EXAM_SESSION_KEY);
    if (!raw) {
      router.replace("/exam");
      return;
    }
    try {
      const data = JSON.parse(raw) as SessionStored;
      if (!data?.questions?.length || !data.setup) {
        router.replace("/exam");
        return;
      }
      setSetup(data.setup);
      setQuestions(data.questions);
      setStates(data.questions.map(() => emptyState()));
      setStartedAt(Date.now());
    } catch {
      router.replace("/exam");
      return;
    }
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    if (!hydrated || !setup || setup.mode !== "exam" || questions.length === 0) return;
    if (examTimerStarted.current) return;
    examTimerStarted.current = true;
    let sec = totalTimerSeconds(questions);
    setRemainingSec(sec);
    const id = window.setInterval(() => {
      sec -= 1;
      setRemainingSec(sec);
      if (sec <= 0) {
        setTimeUp(true);
        window.clearInterval(id);
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
      examTimerStarted.current = false;
    };
  }, [hydrated, setup, questions]);

  const q = questions[currentIndex];
  const st = states[currentIndex] ?? emptyState();

  const updateCurrent = useCallback(
    (patch: Partial<ExamQuestionState>) => {
      setStates((prev) => {
        const next = [...prev];
        next[currentIndex] = { ...next[currentIndex], ...patch };
        return next;
      });
    },
    [currentIndex],
  );

  const totalMarksAll = useMemo(
    () => questions.reduce((s, x) => s + (Number(x.marks) || 0), 0),
    [questions],
  );

  const runningScore = useMemo(() => {
    let earned = 0;
    questions.forEach((qq, i) => {
      const sm = states[i]?.selfMark;
      if (sm) earned += awardedForSelfMark(Number(qq.marks) || 0, sm);
    });
    return { earned, totalPossible: totalMarksAll };
  }, [questions, states, totalMarksAll]);

  const hasAnswer = (idx: number): boolean => {
    const s = states[idx];
    const qq = questions[idx];
    if (!s || !qq) return false;
    if (isMcqQuestion(qq)) return !!s.selectedMcq?.trim();
    return !!s.textAnswer.trim();
  };

  const submitAnswer = () => {
    if (!hasAnswer(currentIndex)) return;
    updateCurrent({ submitted: true });
  };

  const applySelfMark = (sm: SelfMark) => {
    updateCurrent({ selfMark: sm });
  };

  const finishExam = useCallback(() => {
    if (!setup || questions.length === 0) return;
    const items = questions.map((question, i) => {
      const s = states[i];
      const m = Number(question.marks) || 0;
      const awarded = awardedForSelfMark(m, s.selfMark);
      return {
        question,
        textAnswer: s.textAnswer,
        selectedMcq: s.selectedMcq,
        selfMark: s.selfMark,
        awardedMarks: awarded,
      };
    });

    const scoreMarks = items.reduce((s, x) => s + x.awardedMarks, 0);
    const totalMarks = items.reduce((s, x) => s + (Number(x.question.marks) || 0), 0);
    const scorePercent = totalMarks > 0 ? (scoreMarks / totalMarks) * 100 : 0;
    const grade = cambridgeGrade(scorePercent);

    const topicStats = new Map<string, { ok: number; n: number }>();
    items.forEach((it) => {
      const t = it.question.topic || "Unknown";
      const cur = topicStats.get(t) ?? { ok: 0, n: 0 };
      cur.n += 1;
      if (it.selfMark === "full") cur.ok += 1;
      topicStats.set(t, cur);
    });
    const weakTopics: string[] = [];
    topicStats.forEach((v, topic) => {
      const pct = v.n ? (v.ok / v.n) * 100 : 0;
      if (pct < 50 && v.n > 0) weakTopics.push(topic);
    });

    const endedAt = Date.now();
    const payload: ExamResultsPayload = {
      setup,
      items,
      startedAt,
      endedAt,
      totalMarks,
      scoreMarks,
      scorePercent,
      grade,
      weakTopics,
    };

    sessionStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(EXAM_SESSION_KEY);
    router.push("/exam/results");
  }, [setup, questions, states, startedAt, router]);

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      const allMarked = states.every((s, i) => {
        if (!questions[i]) return true;
        return s.selfMark !== null;
      });
      if (allMarked) finishExam();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const quit = () => {
    if (window.confirm("Leave this exam? Progress will be lost.")) {
      sessionStorage.removeItem(EXAM_SESSION_KEY);
      router.push("/practice");
    }
  };

  if (!hydrated || !setup || !q) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-teal-50/60 text-slate-600">
        Loading exam…
      </div>
    );
  }

  const opts = parseMcqOptions(q.options_json);
  const mcq = !!opts;
  const practiceHints = setup.mode === "practice";
  const showHint = practiceHints && st.hintRevealed && !st.submitted;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sidebarCellClass = (idx: number) => {
    const s = states[idx] ?? emptyState();
    const base = "relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition";
    const isCur = idx === currentIndex;
    let bg = "bg-slate-100 text-slate-700";
    if (s.submitted && s.selfMark === "full") bg = "bg-emerald-200 text-emerald-900";
    else if (s.submitted && s.selfMark === "partial") bg = "bg-amber-200 text-amber-900";
    else if (s.submitted && s.selfMark === "zero") bg = "bg-red-200 text-red-900";
    else if (s.flagged) bg = "bg-amber-100 text-amber-900 ring-1 ring-amber-400";
    const ring = isCur ? "ring-2 ring-blue-500 ring-offset-2" : "";
    return `${base} ${bg} ${ring}`;
  };

  const canFinish = states.length > 0 && states.every((s) => s.selfMark !== null);

  return (
    <main className="min-h-screen bg-slate-50 body-font">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="hidden text-slate-400 sm:inline">|</span>
            <span className="max-w-[200px] truncate text-slate-600">{setup.topic}</span>
            {setup.mode === "exam" && remainingSec !== null && (
              <>
                <span className="hidden text-slate-400 sm:inline">|</span>
                <span className={timeUp ? "font-mono font-bold text-red-600" : "font-mono font-semibold text-slate-800"}>
                  {timeUp ? "Time up" : formatTime(remainingSec)}
                </span>
              </>
            )}
            <span className="hidden text-slate-400 md:inline">|</span>
            <span className="text-sm text-[#189080]">
              Score: {runningScore.earned} / {runningScore.totalPossible} marks
            </span>
          </div>
          <button
            type="button"
            onClick={quit}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Quit
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={sidebarCellClass(idx)}
              >
                {idx + 1}
                {states[idx]?.flagged ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-slate-600">
              {currentIndex + 1} / {questions.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= questions.length - 1}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">{q.question_id}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{q.year}</span>
              <span
                className="ml-auto rounded-full px-2 py-0.5 font-semibold text-white"
                style={{ backgroundColor: BRAND_ORANGE }}
              >
                {q.marks} marks
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-700">{q.difficulty}</span>
            </div>
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">{q.topic}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{q.subtopic}</span>
            </div>
            <div className="heading-font text-lg leading-relaxed text-slate-900 md:text-[18px]" style={{ whiteSpace: "pre-wrap" }}>
              {q.question_text}
            </div>
            {q.has_diagram ? (
              <div className="mt-6 flex min-h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Diagram placeholder{q.image_ref ? ` (${q.image_ref})` : ""}
              </div>
            ) : null}

            <div className="mt-8 space-y-4">
              {practiceHints && !st.submitted && (
                <button
                  type="button"
                  onClick={() => updateCurrent({ hintRevealed: true })}
                  className="text-sm font-medium text-[#189080] underline underline-offset-2"
                >
                  Show hint
                </button>
              )}
              {showHint && q.exam_tip ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{q.exam_tip}</div>
              ) : null}

              {mcq && opts ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={st.submitted}
                      onClick={() => {
                        if (st.submitted) return;
                        updateCurrent({
                          selectedMcq: st.selectedMcq === key ? null : key,
                        });
                      }}
                      className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                        st.selectedMcq === key
                          ? "border-[#189080] bg-teal-50 text-slate-900"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      } ${st.submitted ? "opacity-90" : ""}`}
                    >
                      <span className="font-bold text-[#189080]">{key}.</span> {opts[key]}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={st.textAnswer}
                  disabled={st.submitted}
                  onChange={(e) => updateCurrent({ textAnswer: e.target.value })}
                  placeholder="Write your answer here..."
                  rows={6}
                  className="body-font w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#189080] focus:outline-none focus:ring-2 focus:ring-[#189080]/25 disabled:bg-slate-50"
                />
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => updateCurrent({ flagged: !st.flagged })}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
                  st.flagged ? "border-amber-400 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <Bookmark className="h-4 w-4" fill={st.flagged ? "currentColor" : "none"} />
                Flag question
              </button>
              <button
                type="button"
                disabled={!hasAnswer(currentIndex) || st.submitted}
                onClick={submitAnswer}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: BRAND_TEAL }}
              >
                Submit answer
              </button>
            </div>

            {st.submitted && (
              <div className="mt-8 space-y-4 border-t border-slate-100 pt-8">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                  <p className="mb-1 text-xs font-semibold uppercase text-emerald-800">Mark scheme</p>
                  <div className="whitespace-pre-wrap">{q.mark_scheme ?? "—"}</div>
                </div>
                {q.mygradepal_explanation ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <p className="mb-1 text-xs font-semibold text-slate-600">MyGradePal explanation</p>
                    <div className="whitespace-pre-wrap">{q.mygradepal_explanation}</div>
                  </div>
                ) : null}
                {q.exam_tip ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="mb-1 text-xs font-semibold text-amber-800">Exam tip</p>
                    {q.exam_tip}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-slate-700">Self-mark:</span>
                  <button
                    type="button"
                    disabled={st.selfMark !== null}
                    onClick={() => applySelfMark("full")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    ✓ Full marks
                  </button>
                  <button
                    type="button"
                    disabled={st.selfMark !== null}
                    onClick={() => applySelfMark("partial")}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    ~ Partial
                  </button>
                  <button
                    type="button"
                    disabled={st.selfMark !== null}
                    onClick={() => applySelfMark("zero")}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    ✗ Zero
                  </button>
                </div>

                {st.selfMark !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentIndex < questions.length - 1) {
                        setCurrentIndex((i) => i + 1);
                      } else {
                        finishExam();
                      }
                    }}
                    className="mt-2 w-full rounded-xl py-3 text-center text-sm font-semibold text-white md:w-auto md:px-8"
                    style={{ backgroundColor: BRAND_TEAL }}
                  >
                    {currentIndex < questions.length - 1 ? "Next question →" : "View results →"}
                  </button>
                )}
              </div>
            )}
          </article>

          <div className="hidden items-center justify-between md:flex">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= questions.length - 1}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {canFinish ? (
            <button
              type="button"
              onClick={finishExam}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white md:hidden"
              style={{ backgroundColor: BRAND_TEAL }}
            >
              Finish &amp; view results
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
