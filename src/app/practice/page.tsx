"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  figure_description: string | null;
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
const PAGE_SIZE = 50;
const COUNT_PAGE = 1000;
/** Sidebar label for blank subtopic rows; loadBatch treats this as null/empty subtopic in the DB. */
const NO_SUBTOPIC_LABEL = "(No subtopic)";

function applyPracticeBarFilters(
  // Supabase builder chain typing is intricate; narrow at call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  opts: {
    sourceFilter: "all" | "past_paper" | "practice";
    difficulty: string;
    selectedYear: number | null;
    qType: string;
  },
) {
  let q = query;
  if (opts.sourceFilter === "past_paper") q = q.eq("source", "past_paper");
  else if (opts.sourceFilter === "practice") q = q.in("source", ["MGP_Generated", "Cambridge"]);
  if (opts.difficulty !== "All") q = q.eq("difficulty", opts.difficulty.toLowerCase());
  if (opts.selectedYear !== null) q = q.eq("year", opts.selectedYear);
  if (opts.qType !== "All") {
    if (opts.qType === "Calculation") q = q.ilike("question_type", "%calc%");
    else if (opts.qType === "Equation") q = q.ilike("question_type", "%equation%");
    else if (opts.qType === "Diagram") q = q.ilike("question_type", "%diagram%");
    else if (opts.qType === "Explanation") q = q.ilike("question_type", "%explain%");
    else q = q.or("question_type.is.null,question_type.eq.");
  }
  return q;
}

function renderChemicalSubscripts(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  const pattern = /([A-Za-z\)\]])(\d+)/g;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const [full, prefix, digits] = match;
    const start = match.index;
    if (start > lastIndex) out.push(text.slice(lastIndex, start));
    out.push(prefix);
    out.push(
      <sub key={`sub-${start}`} className="align-sub text-[0.8em]">
        {digits}
      </sub>,
    );
    lastIndex = start + full.length;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

function renderMultilineText(text: string): React.ReactNode {
  const lines = text.split(/\r?\n/);
  return lines.map((line, index) => (
    <Fragment key={`line-${index}`}>
      {renderChemicalSubscripts(line)}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function looksLikeTableLine(line: string): boolean {
  return line.includes("|");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isSeparatorLine(line: string): boolean {
  return /\|\s*:?-{3,}:?\s*\|/.test(line);
}

function renderTableCellHtml(cell: string): string {
  const safe = escapeHtml(cell);
  return safe.replace(/\r?\n/g, "<br/>");
}

function sanitizeTableHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function renderTableBlock(block: string, key: string): React.ReactNode {
  const rawLines = block.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parsedRows = rawLines.map((line) => ({ line, cells: parseTableRow(line) }));
  const rows = parsedRows
    .filter((row) => row.cells.length > 0 && row.cells.some((c) => c.length > 0))
    .map((row) => row.cells);

  if (rows.length === 0) return null;

  const separatorIndex = rawLines.findIndex((line) => isSeparatorLine(line));
  const hasHeaderSeparator = separatorIndex >= 0;
  const header = hasHeaderSeparator ? parseTableRow(rawLines[0]) : null;
  const bodyRows = hasHeaderSeparator
    ? parsedRows
        .filter((row, idx) => idx > separatorIndex)
        .map((row) => row.cells)
        .filter((cells) => cells.some((c) => c.length > 0))
    : rows;

  const border = "1px solid #e5e7eb";
  const cellStyle = `border:${border};padding:8px;vertical-align:top;`;
  const headerBg = "#f9fafb";

  const headerHtml = header
    ? `<thead><tr>${header
        .map((cell) => `<th style="${cellStyle}background:${headerBg};text-align:left;font-weight:600;">${renderTableCellHtml(cell)}</th>`)
        .join("")}</tr></thead>`
    : "";
  const bodyHtml = `<tbody>${bodyRows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="${cellStyle}">${renderTableCellHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody>`;
  const safeTableHtml = sanitizeTableHtml(
    `<table style="width:100%;border-collapse:collapse;border:${border};">${headerHtml}${bodyHtml}</table>`,
  );

  return (
    <div key={key} className="overflow-x-auto rounded-lg border border-slate-200">
      <div
        className="text-sm text-slate-700"
        dangerouslySetInnerHTML={{ __html: safeTableHtml }}
      />
    </div>
  );
}

function QuestionText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ kind: "table" | "text"; lines: string[] }> = [];
  let current: { kind: "table" | "text"; lines: string[] } | null = null;

  for (const line of lines) {
    const kind: "table" | "text" = looksLikeTableLine(line) ? "table" : "text";
    if (!current || current.kind !== kind) {
      if (current) blocks.push(current);
      current = { kind, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  return (
    <div className="space-y-3 text-[18px] leading-[1.8] text-slate-700">
      {blocks.map((block, idx) => {
        const joined = block.lines.join("\n");
        if (block.kind === "table") return renderTableBlock(joined, `table-${idx}`);
        return (
          <p key={`text-${idx}`} className="whitespace-normal">
            {renderMultilineText(joined)}
          </p>
        );
      })}
    </div>
  );
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
  /** all | past_paper | practice (MGP_Generated + Cambridge) */
  const [sourceFilter, setSourceFilter] = useState<"all" | "past_paper" | "practice">("all");
  /** null = all years */
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
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
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [sidebarCountsLoading, setSidebarCountsLoading] = useState(false);
  const [failedDiagramRefs, setFailedDiagramRefs] = useState<Record<string, boolean>>({});

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

  const barFilterOpts = useMemo(
    () => ({
      sourceFilter,
      difficulty,
      selectedYear,
      qType,
    }),
    [sourceFilter, difficulty, selectedYear, qType],
  );

  const loadBatch = async (from: number, append: boolean) => {
    const to = from + PAGE_SIZE - 1;
    let query = applyPracticeBarFilters(
      supabase.from("questions").select("*", { count: "exact" }).order("question_id", { ascending: true }),
      barFilterOpts,
    );

    if (activeTopic) query = query.eq("topic", activeTopic);
    if (activeSubtopic) {
      if (activeSubtopic === NO_SUBTOPIC_LABEL) {
        query = query.or("subtopic.is.null,subtopic.eq.");
      } else {
        query = query.eq("subtopic", activeSubtopic);
      }
    }

    const { data, error, count } = await query.range(from, to);

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
      setTotalAvailable(null);
      await loadBatch(0, false);
      setLoading(false);
    };
    void loadInitial();
  }, [activeTopic, activeSubtopic, barFilterOpts]);

  useEffect(() => {
    const loadAggregatedSidebarCounts = async () => {
      setSidebarCountsLoading(true);
      const topicTotals: Record<string, number> = Object.fromEntries(TOPICS.map((t) => [t, 0]));
      const subByTopic: Record<string, Record<string, number>> = {};
      let from = 0;
      for (;;) {
        let q = applyPracticeBarFilters(
          supabase.from("questions").select("topic, subtopic"),
          barFilterOpts,
        );
        const { data, error } = await q.range(from, from + COUNT_PAGE - 1);
        if (error) {
          console.error("[practice] failed to load sidebar counts", error.message);
          setSidebarCountsLoading(false);
          return;
        }
        const rows = (data ?? []) as Array<{ topic?: string; subtopic?: string | null }>;
        for (const row of rows) {
          const topic = row.topic ?? "";
          if (topicTotals[topic] === undefined) continue;
          topicTotals[topic] += 1;
          const subLabel = String(row.subtopic ?? "").trim() || NO_SUBTOPIC_LABEL;
          if (!subByTopic[topic]) subByTopic[topic] = {};
          subByTopic[topic][subLabel] = (subByTopic[topic][subLabel] ?? 0) + 1;
        }
        if (rows.length < COUNT_PAGE) break;
        from += COUNT_PAGE;
      }
      setTopicCounts(topicTotals);
      setSubtopicCounts(subByTopic);
      setSidebarCountsLoading(false);
    };
    void loadAggregatedSidebarCounts();
  }, [barFilterOpts]);

  const hasActiveBarFilters =
    selectedYear !== null ||
    difficulty !== "All" ||
    qType !== "All" ||
    sourceFilter !== "all";

  const clearBarFilters = () => {
    setSelectedYear(null);
    setDifficulty("All");
    setQType("All");
    setSourceFilter("all");
  };

  const filtered = useMemo(() => allQuestions, [allQuestions]);

  const displayedMatchCount =
    totalAvailable ?? (!loading ? filtered.length : null);

  const showingCountPhrase =
    displayedMatchCount === null
      ? null
      : `${displayedMatchCount} question${displayedMatchCount === 1 ? "" : "s"}`;

  const filterSelectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40";

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

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-4 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Topics</h2>
          <div className="space-y-2">
            {TOPICS.map((topic) => {
              const sortedSubs = Object.keys(subtopicCounts[topic] ?? {}).sort((a, b) =>
                a.localeCompare(b),
              );
              const topicTotal = topicCounts[topic] ?? 0;
              return (
                <div key={topic} className="rounded-lg border border-slate-100">
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50`}
                    onClick={() => setOpenTopics((prev) => ({ ...prev, [topic]: !prev[topic] }))}
                  >
                    <span className="font-medium text-slate-800">{topic}</span>
                    <span className="tabular-nums text-slate-600">
                      {sidebarCountsLoading ? (
                        <>
                          {"  "}
                          <span aria-hidden>…</span>
                        </>
                      ) : (
                        <>{"  "}
                          {topicTotal}
                        </>
                      )}
                    </span>
                  </button>
                  {openTopics[topic] && (
                    <div className="border-t border-slate-100 px-2 pb-2 pt-1">
                      <button
                        type="button"
                        className={`mb-1 block w-full rounded px-2 py-1.5 text-left text-xs ${
                          activeTopic === topic && activeSubtopic === null
                            ? "bg-teal-100 font-medium text-teal-900 ring-1 ring-teal-200"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setOpenTopics((prev) => ({ ...prev, [topic]: true }));
                          if (activeTopic === topic && activeSubtopic === null) {
                            setActiveTopic(null);
                          } else {
                            setActiveTopic(topic);
                            setActiveSubtopic(null);
                          }
                        }}
                      >
                        <span className="tabular-nums text-slate-800">
                          All subtopics
                          {sidebarCountsLoading ? (
                            <>
                              {"  "}
                              <span aria-hidden>…</span>
                            </>
                          ) : (
                            <>
                              {"  "}
                              {topicTotal}
                            </>
                          )}
                        </span>
                      </button>
                      {sortedSubs.map((sub) => {
                        const n = subtopicCounts[topic]?.[sub] ?? 0;
                        const isActive = activeTopic === topic && activeSubtopic === sub;
                        return (
                          <button
                            type="button"
                            key={`${topic}-${sub}`}
                            className={`mb-0.5 block w-full rounded px-2 py-1.5 text-left text-xs ${
                              isActive
                                ? "bg-teal-100 font-medium text-teal-900 ring-1 ring-teal-200"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              setOpenTopics((prev) => ({ ...prev, [topic]: true }));
                              setActiveTopic(topic);
                              setActiveSubtopic((prevSub) =>
                                prevSub === sub ? null : sub,
                              );
                            }}
                          >
                            <span className="tabular-nums">
                              <span className="text-slate-800">{sub}</span>
                              {sidebarCountsLoading ? (
                                <>
                                  {"  "}
                                  <span className="text-slate-600" aria-hidden>
                                    …
                                  </span>
                                </>
                              ) : (
                                <>
                                  {"  "}
                                  <span className="text-slate-600">{n}</span>
                                </>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Practice progress</p>
              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
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

          <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">Filter questions</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label htmlFor="filter-year" className="block text-xs font-medium text-slate-600">
                  Year
                </label>
                <select
                  id="filter-year"
                  value={selectedYear === null ? "" : String(selectedYear)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedYear(v === "" ? null : Number(v));
                  }}
                  className={filterSelectClass}
                >
                  <option value="">All Years</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="filter-difficulty" className="block text-xs font-medium text-slate-600">
                  Difficulty
                </label>
                <select
                  id="filter-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="All">All</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="filter-type" className="block text-xs font-medium text-slate-600">
                  Type
                </label>
                <select
                  id="filter-type"
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="All">All</option>
                  <option value="Short">Short</option>
                  <option value="Calculation">Calculation</option>
                  <option value="Equation">Equation</option>
                  <option value="Diagram">Diagram</option>
                  <option value="Explanation">Explanation</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="filter-source" className="block text-xs font-medium text-slate-600">
                  Source
                </label>
                <select
                  id="filter-source"
                  value={sourceFilter}
                  onChange={(e) =>
                    setSourceFilter(e.target.value as "all" | "past_paper" | "practice")
                  }
                  className={filterSelectClass}
                >
                  <option value="all">All Questions</option>
                  <option value="past_paper">Past Papers Only</option>
                  <option value="practice">Practice Questions</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
              <p className="text-sm font-medium text-teal-700 tabular-nums">
                Showing {showingCountPhrase ?? "…"}
              </p>
              {hasActiveBarFilters ? (
                <button
                  type="button"
                  className="text-sm font-medium text-teal-600 underline underline-offset-2 hover:text-teal-800"
                  onClick={clearBarFilters}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          {!loading && filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No questions found for these filters - try adjusting your selection.
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
                        <QuestionText text={q.question_text} />
                        {q.has_diagram && (
                          <>
                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                              Diagram
                            </p>
                            {q.image_ref && !failedDiagramRefs[q.id] ? (
                              <img
                                src={`/api/diagram?ref=${encodeURIComponent(q.image_ref)}`}
                                alt="Question diagram"
                                className="w-full max-w-full rounded-[8px] border border-slate-200"
                                onError={() =>
                                  setFailedDiagramRefs((prev) => ({
                                    ...prev,
                                    [q.id]: true,
                                  }))
                                }
                              />
                            ) : null}
                            {q.figure_description?.trim() ? (
                              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                                <p className="text-sm text-indigo-900">{q.figure_description}</p>
                              </div>
                            ) : !q.image_ref || failedDiagramRefs[q.id] ? (
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
                            ) : null}
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
