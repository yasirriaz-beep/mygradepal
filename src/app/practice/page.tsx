"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type ResultType = "got_it" | "close" | "missed";

type Question = {
  id: string;
  question_id: string;
  topic: string;
  subtopic: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  year: number;
  paper_type: string;
  ao_level: "AO1" | "AO2" | "AO3" | null;
  question_type: string | null;
  question_text: string;
  mark_scheme: string | null;
  exam_tip: string | null;
  common_mistake: string | null;
  has_diagram: boolean;
  image_ref: string | null;
  source: string;
};

type AttemptRow = {
  question_id: string;
  result: ResultType;
  attempted_at: string;
};

const TOPICS = [
  "Acids Bases and Salts",
  "Air and Water",
  "Atoms Elements and Compounds",
  "Chemical Energetics",
  "Chemical Reactions",
  "Electrochemistry",
  "Experimental Techniques",
  "Metals",
  "Organic Chemistry",
  "States of Matter",
  "Stoichiometry",
  "The Periodic Table",
] as const;

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => 2016 + i);
const PAPER_OPTIONS = ["P21", "P22", "P23", "P41", "P42", "P43"];
const PAGE_SIZE = 50;

function normalizePaperType(paperType: string): string {
  const value = paperType.toUpperCase().replace(/\s+/g, "");
  if (value.startsWith("P")) return value;
  if (/^\d{2}$/.test(value)) return `P${value}`;
  return value;
}

function normalizeQuestionType(value: string | null): string {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("calc")) return "Calculation";
  if (v.includes("equation")) return "Equation";
  if (v.includes("diagram")) return "Diagram";
  if (v.includes("explain")) return "Explanation";
  return "Short";
}

function getPaperIdFromQuestionId(questionId: string): string | null {
  // Example: 0620_s25_p42_q1a -> 0620_s25_p42
  const parts = questionId.split("_q");
  if (parts.length < 2) return null;
  return parts[0];
}

export default function PracticePage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [activeSubtopic, setActiveSubtopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("All");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [paper, setPaper] = useState("All");
  const [aoLevel, setAoLevel] = useState("All");
  const [qType, setQType] = useState("All");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [userId, setUserId] = useState("demo-user");
  const [attemptsByQuestionId, setAttemptsByQuestionId] = useState<Record<string, ResultType>>({});
  const [feedbackByCardId, setFeedbackByCardId] = useState<Record<string, ResultType>>({});
  const feedbackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadAttempts = async () => {
      const { data, error } = await supabase
        .from("user_attempts")
        .select("question_id, result, attempted_at")
        .eq("user_id", userId)
        .order("attempted_at", { ascending: false });

      if (error) return;

      const latest: Record<string, ResultType> = {};
      for (const row of (data ?? []) as AttemptRow[]) {
        if (!latest[row.question_id]) latest[row.question_id] = row.result;
      }
      setAttemptsByQuestionId(latest);
    };
    void loadAttempts();
  }, [userId]);

  const loadBatch = async (from: number, append: boolean) => {
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from("questions")
      .select("*", { count: "exact" })
      .eq("source", "past_paper")
      .order("question_id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[practice] failed to load questions", {
        message: error.message,
        hint: error.hint,
        details: error.details,
        note: "If this is a permission/RLS issue, ensure anon role has SELECT on public.questions and an allow SELECT policy.",
      });
      return;
    }

    const rows = (data ?? []) as Question[];
    setTotalAvailable(count ?? null);
    console.log(`[practice] fetched ${rows.length} rows (range ${from}-${to})`);
    setAllQuestions((prev) => (append ? [...prev, ...rows] : rows));

    const newCursor = from + rows.length;
    setCursor(newCursor);
    if (rows.length < PAGE_SIZE) {
      setHasMore(false);
    } else if (typeof count === "number") {
      setHasMore(newCursor < count);
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setAllQuestions([]);
      setCursor(0);
      setHasMore(true);
      await loadBatch(0, false);
      setLoading(false);
    };
    void loadInitial();
  }, []);

  useEffect(() => {
    const loadTopicCounts = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("topic")
        .eq("source", "past_paper");
      if (error) {
        console.error("[practice] failed to load topic counts", error.message);
        return;
      }
      const counts: Record<string, number> = {};
      for (const t of TOPICS) counts[t] = 0;
      for (const row of (data ?? []) as Array<{ topic?: string }>) {
        const topic = row.topic ?? "";
        if (counts[topic] !== undefined) counts[topic] += 1;
      }
      setTopicCounts(counts);
    };
    void loadTopicCounts();
  }, []);

  const subtopicMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const q of allQuestions) {
      if (!map[q.topic]) map[q.topic] = new Set();
      if (q.subtopic) map[q.topic].add(q.subtopic);
    }
    return map;
  }, [allQuestions]);

  const filtered = useMemo(() => {
    return allQuestions.filter((q) => {
      const qPaper = normalizePaperType(q.paper_type);
      const qDifficulty = q.difficulty?.toLowerCase() ?? "medium";
      const questionType = normalizeQuestionType(q.question_type);
      const topicMatch = !activeTopic || q.topic === activeTopic;
      const subtopicMatch = !activeSubtopic || q.subtopic === activeSubtopic;
      const difficultyMatch = difficulty === "All" || qDifficulty === difficulty.toLowerCase();
      const yearMatch = selectedYears.length === 0 || selectedYears.includes(Number(q.year));
      const paperMatch = paper === "All" || qPaper === paper;
      const aoMatch = aoLevel === "All" || (q.ao_level ?? "") === aoLevel;
      const typeMatch = qType === "All" || questionType === qType;
      return topicMatch && subtopicMatch && difficultyMatch && yearMatch && paperMatch && aoMatch && typeMatch;
    });
  }, [allQuestions, activeTopic, activeSubtopic, difficulty, selectedYears, paper, aoLevel, qType]);

  const attemptedCount = useMemo(
    () => filtered.filter((q) => Boolean(attemptsByQuestionId[q.question_id])).length,
    [filtered, attemptsByQuestionId],
  );
  const attemptedPct = filtered.length > 0 ? Math.round((attemptedCount / filtered.length) * 100) : 0;

  const saveAttempt = async (questionId: string, cardId: string, result: ResultType) => {
    // Optimistic update for immediate chip/progress feedback.
    setAttemptsByQuestionId((prev) => ({ ...prev, [questionId]: result }));
    setFeedbackByCardId((prev) => ({ ...prev, [cardId]: result }));
    setTimeout(() => {
      feedbackRefs.current[cardId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    const res = await fetch("/api/practice/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, question_id: questionId, result }),
    });
    if (res.ok) setSaveStatus("Attempt saved");
  };

  const loadMoreQuestions = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadBatch(cursor, true);
    setLoadingMore(false);
  };

  if (loading) return <div className="p-6">Loading questions...</div>;

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-4 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Topics</h2>
          <div className="space-y-2">
            {TOPICS.map((topic) => (
              <div key={topic} className="rounded-lg border border-slate-100">
                <button
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${activeTopic === topic ? "bg-teal-50 text-teal-700" : "text-slate-700"}`}
                  onClick={() => {
                    setActiveTopic((prev) => (prev === topic ? null : topic));
                    setActiveSubtopic(null);
                  }}
                >
                  <span>{topic}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{topicCounts[topic] ?? 0}</span>
                </button>
                <button
                  className="w-full border-t border-slate-100 px-3 py-1 text-left text-xs text-slate-500"
                  onClick={() => setOpenTopics((prev) => ({ ...prev, [topic]: !prev[topic] }))}
                >
                  {openTopics[topic] ? "Hide subtopics" : "Show subtopics"}
                </button>
                {openTopics[topic] && (
                  <div className="px-3 pb-2">
                    {Array.from(subtopicMap[topic] ?? []).map((sub) => (
                      <button
                        key={sub}
                        className={`block w-full rounded px-2 py-1 text-left text-xs ${activeSubtopic === sub ? "bg-teal-100 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
                        onClick={() => {
                          setActiveTopic(topic);
                          setActiveSubtopic((prev) => (prev === sub ? null : sub));
                        }}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              {attemptedCount} / {filtered.length} questions attempted
            </p>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-teal-600 transition-all"
                style={{ width: `${attemptedPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-5">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded border border-slate-300 px-2 py-2 text-sm">
                <option>All</option><option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
              <select
                multiple
                value={selectedYears.map(String)}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                  setSelectedYears(vals);
                }}
                className="h-28 rounded border border-slate-300 px-2 py-2 text-sm"
              >
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded border border-slate-300 px-2 py-2 text-sm">
                <option>All</option>
                {PAPER_OPTIONS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select value={aoLevel} onChange={(e) => setAoLevel(e.target.value)} className="rounded border border-slate-300 px-2 py-2 text-sm">
                <option>All</option><option>AO1</option><option>AO2</option><option>AO3</option>
              </select>
              <select value={qType} onChange={(e) => setQType(e.target.value)} className="rounded border border-slate-300 px-2 py-2 text-sm">
                <option>All</option><option>Short</option><option>Calculation</option><option>Equation</option><option>Diagram</option><option>Explanation</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No questions match current filters.
            </div>
          ) : (
            <>
              {filtered.map((q) => {
                const isExpanded = expandedQuestion === q.id;
                const showAns = !!showAnswer[q.id];
                const attempt = attemptsByQuestionId[q.question_id];
                const feedback = feedbackByCardId[q.id];
                const chip =
                  attempt === "got_it"
                    ? { label: "Got it", cls: "bg-green-100 text-green-700" }
                    : attempt === "close"
                      ? { label: "Close", cls: "bg-amber-100 text-amber-700" }
                      : attempt === "missed"
                        ? { label: "Missed it", cls: "bg-red-100 text-red-700" }
                        : { label: "Not attempted", cls: "bg-slate-100 text-slate-600" };
                return (
                  <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-slate-100 px-2 py-1">{q.topic}</span>
                      <span className="rounded bg-slate-100 px-2 py-1">{q.subtopic}</span>
                      <span className="rounded bg-amber-100 px-2 py-1">{q.marks} marks</span>
                      <span className="rounded bg-emerald-100 px-2 py-1 capitalize">{q.difficulty}</span>
                      <span className="rounded bg-indigo-100 px-2 py-1">{q.year}</span>
                      <span className={`rounded px-2 py-1 ${chip.cls}`}>{chip.label}</span>
                    </div>
                    <button
                      className="text-left text-sm font-medium text-slate-800 hover:text-teal-700"
                      onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                    >
                      {q.question_id} {isExpanded ? "▲" : "▼"}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 text-sm text-slate-700">
                        <p className="text-[18px] leading-[1.8]">{q.question_text}</p>
                        {q.has_diagram && (
                          <>
                            {q.figure_description?.trim() ? (
                              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                                  Diagram
                                </p>
                                <p className="text-sm text-indigo-900">{q.figure_description}</p>
                              </div>
                            ) : q.image_ref ? (
                              <img
                                src={`/output/images/${q.image_ref}`}
                                alt="Question diagram"
                                className="max-h-80 rounded border border-slate-200 object-contain"
                              />
                            ) : (
                              <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-slate-600">
                                <p className="text-sm">Diagram required — refer to original paper.</p>
                                {getPaperIdFromQuestionId(q.question_id) && (
                                  <a
                                    href={`/papers/${getPaperIdFromQuestionId(q.question_id)}_qp.pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-xs font-medium text-slate-700 underline"
                                  >
                                    Download original PDF
                                  </a>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        <button
                          className="rounded border border-slate-300 px-3 py-1 text-xs"
                          onClick={() => setShowAnswer((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                        >
                          {showAns ? "Hide Answer" : "Show Answer"}
                        </button>

                        {showAns && <p className="rounded bg-slate-50 p-3">{q.mark_scheme ?? "No answer available."}</p>}

                        <div className="flex gap-2">
                          <button className="rounded bg-green-600 px-3 py-1 text-xs text-white" onClick={() => void saveAttempt(q.question_id, q.id, "got_it")}>Got it</button>
                          <button className="rounded bg-amber-500 px-3 py-1 text-xs text-white" onClick={() => void saveAttempt(q.question_id, q.id, "close")}>Close</button>
                          <button className="rounded bg-red-600 px-3 py-1 text-xs text-white" onClick={() => void saveAttempt(q.question_id, q.id, "missed")}>Missed it</button>
                        </div>

                        {feedback && (
                          <div
                            ref={(el) => {
                              feedbackRefs.current[q.id] = el;
                            }}
                            className={`rounded-lg border p-3 ${
                              feedback === "got_it"
                                ? "border-green-200 bg-[#F0FFF4] text-green-900"
                                : feedback === "close"
                                  ? "border-blue-200 bg-[#F0F7FF] text-blue-900"
                                  : "border-red-200 bg-[#FFF0F0] text-red-900"
                            }`}
                          >
                            {feedback === "got_it" && (
                              <>
                                <p className="mb-2 text-sm font-semibold">Well done - full marks</p>
                                <p className="rounded bg-white/70 p-2 text-sm font-medium">{q.mark_scheme ?? "No answer available."}</p>
                              </>
                            )}

                            {feedback === "close" && (
                              <>
                                <p className="mb-2 text-sm font-semibold">Almost - here&apos;s what you missed</p>
                                <p className="mb-2 rounded bg-white/70 p-2 text-sm">{q.mark_scheme ?? "No mark scheme available."}</p>
                                {q.exam_tip && (
                                  <p className="text-sm">
                                    <span className="font-semibold">Exam tip:</span> {q.exam_tip}
                                  </p>
                                )}
                              </>
                            )}

                            {feedback === "missed" && (
                              <>
                                <p className="mb-2 text-sm font-semibold">Let&apos;s learn from this</p>
                                <p className="mb-2 rounded bg-white/70 p-2 text-sm">{q.mark_scheme ?? "No answer available."}</p>
                                {q.common_mistake && (
                                  <p className="mb-2 text-sm">
                                    <span className="font-semibold">Common mistake:</span> {q.common_mistake}
                                  </p>
                                )}
                                {q.exam_tip && (
                                  <p className="mb-2 text-sm">
                                    <span className="font-semibold">Exam tip:</span> {q.exam_tip}
                                  </p>
                                )}
                                <a
                                  href={`/learn?subtopic=${encodeURIComponent(q.subtopic)}`}
                                  className="inline-block rounded bg-red-700 px-3 py-1 text-xs font-medium text-white"
                                >
                                  Study this topic
                                </a>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <span>
                  Loaded {allQuestions.length}
                  {totalAvailable !== null ? ` of ${totalAvailable}` : ""} questions
                </span>
                <button
                  className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                  disabled={!hasMore || loadingMore}
                  onClick={() => void loadMoreQuestions()}
                >
                  {loadingMore ? "Loading..." : hasMore ? "Load more" : "All loaded"}
                </button>
              </div>
            </>
          )}
          {saveStatus && <p className="text-xs text-emerald-700">{saveStatus}</p>}
        </section>
      </div>
    </div>
  );
}
