"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import FinishSession from "@/components/FinishSession";
import { supabase } from "@/lib/supabase";
import { startSession, updateSession } from "@/lib/studySessionClient";
import { getTrialUsage, TRIAL_LIMITS } from "@/lib/trialLimits";

const TEAL = "#189080";
const ORANGE = "#f5731e";

const SUBJECTS = [
  { name: "Chemistry", code: "0620", color: TEAL },
  { name: "Physics", code: "0625", color: "#137265" },
  { name: "Mathematics", code: "0580", color: ORANGE },
  { name: "Biology", code: "0610", color: "#16a34a" },
];

const CHEMISTRY_TOPICS = [
  "States of Matter",
  "Atoms, Elements and Compounds",
  "Stoichiometry",
  "Electrochemistry",
  "Chemical Energetics",
  "Chemical Reactions",
  "Acids, Bases and Salts",
  "The Periodic Table",
  "Metals",
  "Chemistry of the Environment",
  "Organic Chemistry",
  "Experimental Techniques & Analysis",
];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: "#f0fdf4", text: "#16a34a" },
  medium: { bg: "#fff7ed", text: "#d97706" },
  hard: { bg: "#fef2f2", text: "#dc2626" },
};

type QuestionRow = {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  marks: number;
  year: number;
  session: string;
  paper_type: string;
  question_text: string;
  source: string;
};

function PracticePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [studentId, setStudentId] = useState("demo-student");
  const [studentName, setStudentName] = useState("Student");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [activeSubject, setActiveSubject] = useState(searchParams.get("subject") ?? "Chemistry");
  const [activeTopic, setActiveTopic] = useState<string | null>(searchParams.get("topic"));
  const [activeType, setActiveType] = useState("All");
  const [activeDiff, setActiveDiff] = useState("All");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

  const [isTrialBlocked, setIsTrialBlocked] = useState(false);
  const [trialUsed, setTrialUsed] = useState(0);

  const PAGE_SIZE = 20;

  // -- Auth ---------------------------------------------------------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setStudentId(data.user.id);
      setStudentName(
        String(data.user.user_metadata?.child_name ?? data.user.user_metadata?.name ?? "Student")
      );
    });
  }, []);

  // -- Session tracking ---------------------------------------------------
  useEffect(() => {
    startSession({ studentId, source: "practice", topic: activeTopic ?? undefined })
      .then((s) => setSessionId(s.sessionId))
      .catch(() => setSessionId(null));
  }, [studentId, activeTopic]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(() => {
      void updateSession({ sessionId, studentId, incrementMinutes: 1 });
    }, 60000);
    return () => clearInterval(timer);
  }, [sessionId, studentId]);

  // -- Topic counts -------------------------------------------------------
  useEffect(() => {
    supabase
      .from("questions")
      .select("topic")
      .eq("subject", activeSubject)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((r: { topic: string }) => {
          if (r.topic) counts[r.topic] = (counts[r.topic] ?? 0) + 1;
        });
        setTopicCounts(counts);
      });
  }, [activeSubject]);

  // -- Load questions -----------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Trial check
      const usage = await getTrialUsage(studentId);
      setTrialUsed(usage.questionsUsed);
      if (usage.questionsUsed >= TRIAL_LIMITS.questions) {
        setIsTrialBlocked(true);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("questions")
        .select(
          "id, subject, topic, subtopic, difficulty, marks, year, session, paper_type, question_text, source"
        )
        .eq("subject", activeSubject)
        .order("topic", { ascending: true })
        .order("difficulty", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (activeTopic) query = query.eq("topic", activeTopic);
      if (activeType !== "All") query = query.eq("paper_type", activeType);
      if (activeDiff !== "All") query = query.eq("difficulty", activeDiff.toLowerCase());

      const { data, error } = await query;
      if (error) console.error(error.message);

      const rows = (data ?? []) as QuestionRow[];
      setQuestions(page === 0 ? rows : (prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    };

    void load();
  }, [studentId, activeSubject, activeTopic, activeType, activeDiff, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [activeSubject, activeTopic, activeType, activeDiff]);

  const subjectColor = SUBJECTS.find((s) => s.name === activeSubject)?.color ?? TEAL;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f0faf8",
        fontFamily: "'DM Sans', sans-serif",
        paddingBottom: 80,
      }}
    >
      {/* Trial blocked overlay */}
      {isTrialBlocked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 32,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
              Free trial complete
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
              {studentName} used {trialUsed} questions during the trial.
            </p>
            <button
              onClick={() => router.push("/pricing")}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 12,
                background: TEAL,
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Upgrade to continue →
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 16px 20px" }}>
        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            margin: "0 0 4px",
          }}
        >
          Practice
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>
          {activeTopic ?? activeSubject} · Past paper style questions
        </p>
      </div>

      {/* Subject tabs */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          overflowX: "auto",
        }}
      >
        {SUBJECTS.map((sub) => (
          <button
            key={sub.name}
            onClick={() => {
              setActiveSubject(sub.name);
              setActiveTopic(null);
            }}
            style={{
              flex: "0 0 auto",
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: activeSubject === sub.name ? 700 : 500,
              color: activeSubject === sub.name ? sub.color : "#9ca3af",
              background: "none",
              border: "none",
              borderBottom: `3px solid ${
                activeSubject === sub.name ? sub.color : "transparent"
              }`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {sub.name}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* Topic selector */}
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 8px",
            }}
          >
            Topic
          </p>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            <button
              onClick={() => setActiveTopic(null)}
              style={{
                flexShrink: 0,
                padding: "7px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: `1.5px solid ${!activeTopic ? subjectColor : "#e5e7eb"}`,
                background: !activeTopic ? subjectColor + "18" : "white",
                color: !activeTopic ? subjectColor : "#6b7280",
                cursor: "pointer",
              }}
            >
              All Topics
            </button>
            {CHEMISTRY_TOPICS.map((topic) => {
              const count = topicCounts[topic] ?? 0;
              const isActive = activeTopic === topic;
              return (
                <button
                  key={topic}
                  onClick={() => setActiveTopic(topic)}
                  style={{
                    flexShrink: 0,
                    padding: "7px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1.5px solid ${isActive ? subjectColor : "#e5e7eb"}`,
                    background: isActive ? subjectColor + "18" : "white",
                    color: isActive ? subjectColor : "#6b7280",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {topic}
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        background: isActive ? subjectColor : "#f3f4f6",
                        color: isActive ? "white" : "#9ca3af",
                        borderRadius: 20,
                        padding: "1px 6px",
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {/* Paper type */}
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "MCQ", "Theory", "Practical"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1.5px solid ${activeType === t ? subjectColor : "#e5e7eb"}`,
                  background: activeType === t ? subjectColor + "18" : "white",
                  color: activeType === t ? subjectColor : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Easy", "Medium", "Hard"].map((d) => (
              <button
                key={d}
                onClick={() => setActiveDiff(d)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1.5px solid ${activeDiff === d ? "#374151" : "#e5e7eb"}`,
                  background: activeDiff === d ? "#374151" : "white",
                  color: activeDiff === d ? "white" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>
          {loading && page === 0 ? "Loading..." : `${questions.length} questions${hasMore ? "+" : ""}`}
        </p>

        {/* Question cards */}
        {!loading && questions.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ fontSize: 32, margin: "0 0 10px" }}>📭</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
              No questions found
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              Try a different topic or filter
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {questions.map((q) => {
              const diffStyle =
                DIFFICULTY_COLORS[q.difficulty?.toLowerCase()] ?? DIFFICULTY_COLORS.medium;
              return (
                <div
                  key={q.id}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    padding: "14px 16px",
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: subjectColor,
                        background: subjectColor + "18",
                        borderRadius: 6,
                        padding: "2px 8px",
                      }}
                    >
                      {q.paper_type ?? "MCQ"}
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
                      {q.difficulty ?? "medium"}
                    </span>
                    {q.source === "Cambridge" && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#7c3aed",
                          background: "#f5f3ff",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontWeight: 600,
                        }}
                      >
                        📄 Cambridge {q.year}
                      </span>
                    )}
                    {q.source === "MGP_Generated" && (
                      <span
                        style={{
                          fontSize: 10,
                          color: ORANGE,
                          background: "#fff7ed",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontWeight: 600,
                        }}
                      >
                        ⚡ Expert
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                      {q.marks} mark{q.marks !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Topic */}
                  <p style={{ fontSize: 12, fontWeight: 600, color: subjectColor, margin: "0 0 6px" }}>
                    {q.topic} {q.subtopic ? `· ${q.subtopic}` : ""}
                  </p>

                  {/* Question preview */}
                  <p
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      lineHeight: 1.6,
                      margin: "0 0 12px",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {q.question_text}
                  </p>

                  {/* Attempt button */}
                  <Link
                    href={`/question?id=${encodeURIComponent(String(q.id))}`}
                    style={{
                      display: "inline-block",
                      background: subjectColor,
                      color: "white",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Attempt question →
                  </Link>
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 12,
                  background: "white",
                  border: `1.5px solid ${subjectColor}`,
                  color: subjectColor,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                {loading ? "Loading..." : "Load more questions →"}
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
      <Suspense fallback={null}>
        <FinishSession />
      </Suspense>
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p>Loading...</p>
        </div>
      }
    >
      <PracticePageContent />
    </Suspense>
  );
}
