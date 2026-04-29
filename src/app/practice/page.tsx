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

const QUESTION_TYPE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  mcq: { border: "#1D9E75", bg: "#E1F5EE", text: "#0F6E56" },
  theory: { border: "#7F77DD", bg: "#EEEDFE", text: "#3C3489" },
  practical: { border: "#D85A30", bg: "#FAECE7", text: "#712B13" },
};

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

const getChapterFromTopic = (topicParam: string): string => {
  const t = topicParam.toLowerCase();

  if (
    t.includes("state") ||
    t.includes("solid") ||
    t.includes("liquid") ||
    t.includes("gas") ||
    t.includes("melting") ||
    t.includes("boiling") ||
    t.includes("evapor") ||
    t.includes("diffusion") ||
    t.includes("heating curve") ||
    t.includes("cooling curve") ||
    (t.includes("pressure") && t.includes("volume"))
  )
    return "States of Matter";

  if (
    t.includes("atom") ||
    t.includes("element") ||
    t.includes("compound") ||
    t.includes("bond") ||
    t.includes("ionic") ||
    t.includes("covalent") ||
    t.includes("metallic") ||
    t.includes("isotope") ||
    t.includes("electron config") ||
    t.includes("proton") ||
    t.includes("neutron") ||
    t.includes("diamond") ||
    t.includes("graphite") ||
    t.includes("mixture")
  )
    return "Atoms, Elements and Compounds";

  if (
    t.includes("mole") ||
    t.includes("stoich") ||
    t.includes("empirical") ||
    t.includes("molecular formula") ||
    t.includes("concentration") ||
    t.includes("reacting mass") ||
    t.includes("balancing") ||
    t.includes("avogadro") ||
    t.includes("gas volume") ||
    t.includes("yield")
  )
    return "Stoichiometry";

  if (
    t.includes("electrolysis") ||
    t.includes("electroplat") ||
    t.includes("fuel cell") ||
    t.includes("anode") ||
    t.includes("cathode") ||
    t.includes("brine") ||
    t.includes("electrochem")
  )
    return "Electrochemistry";

  if (
    t.includes("exothermic") ||
    t.includes("endothermic") ||
    t.includes("bond energy") ||
    t.includes("activation energy") ||
    t.includes("energy profile") ||
    t.includes("energetic")
  )
    return "Chemical Energetics";

  if (
    t.includes("rate of reaction") ||
    t.includes("collision") ||
    t.includes("equilibrium") ||
    t.includes("reversible") ||
    t.includes("catalyst") ||
    t.includes("rate graph")
  )
    return "Chemical Reactions";

  if (
    t.includes("acid") ||
    t.includes("alkali") ||
    t.includes("neutrali") ||
    t.includes("titration") ||
    t.includes("salt") ||
    t.includes("ph scale") ||
    t.includes("indicator") ||
    t.includes("oxide")
  )
    return "Acids, Bases and Salts";

  if (
    t.includes("group 1") ||
    t.includes("group 7") ||
    t.includes("halogen") ||
    t.includes("alkali metal") ||
    t.includes("transition metal") ||
    t.includes("period 3") ||
    t.includes("periodic table")
  )
    return "The Periodic Table";

  if (
    t.includes("reactivity series") ||
    t.includes("blast furnace") ||
    t.includes("rusting") ||
    t.includes("alloy") ||
    t.includes("extraction of metal") ||
    t.includes("aluminium extraction") ||
    t.includes("sacrificial") ||
    t.includes("galvani")
  )
    return "Metals";

  if (
    t.includes("water treatment") ||
    t.includes("hard water") ||
    t.includes("air pollution") ||
    t.includes("greenhouse") ||
    t.includes("eutrophication") ||
    t.includes("fertiliser") ||
    t.includes("acid rain") ||
    t.includes("environment")
  )
    return "Chemistry of the Environment";

  if (
    t.includes("alkane") ||
    t.includes("alkene") ||
    t.includes("alcohol") ||
    t.includes("ester") ||
    t.includes("polymer") ||
    t.includes("fermentation") ||
    t.includes("carboxylic") ||
    t.includes("amino acid") ||
    t.includes("organic") ||
    t.includes("crude oil") ||
    t.includes("cracking") ||
    t.includes("nylon")
  )
    return "Organic Chemistry";

  if (
    t.includes("filtration") ||
    t.includes("distillation") ||
    t.includes("chromatography") ||
    t.includes("flame test") ||
    t.includes("rf value") ||
    t.includes("experimental") ||
    t.includes("qualitative") ||
    t.includes("gas test") ||
    t.includes("ion test")
  )
    return "Experimental Techniques & Analysis";

  // fallback: return original param (handles direct chapter-level clicks)
  return topicParam;
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: "#EAF3DE", text: "#27500A" },
  medium: { bg: "#FAEEDA", text: "#633806" },
  hard: { bg: "#FCEBEB", text: "#791F1F" },
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
  diagram_url?: string | null;
};

function PracticePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTopic = searchParams.get("topic") ?? "";
  const chapterTopic = getChapterFromTopic(rawTopic);

  const [studentId, setStudentId] = useState("demo-student");
  const [studentName, setStudentName] = useState("Student");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [activeSubject, setActiveSubject] = useState(searchParams.get("subject") ?? "Chemistry");
  const [activeTopic, setActiveTopic] = useState<string | null>(chapterTopic || null);
  const [activeType, setActiveType] = useState("All");
  const [activeDiff, setActiveDiff] = useState("All");
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

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
          "id, subject, topic, subtopic, difficulty, marks, year, session, paper_type, question_text, source, diagram_url"
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
          {activeTopic ?? activeSubject} · Exam style questions
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
        {/* Filters */}
        <div
          style={{
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: "14px 14px 12px",
            marginBottom: 14,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 11, fontWeight: 700, color: "#6b7280",
              textTransform: "uppercase", letterSpacing: 1,
              display: "block", marginBottom: 6
            }}>
              Topic
            </label>
            <select
              value={activeTopic ?? "All Topics"}
              onChange={(e) => setActiveTopic(e.target.value === "All Topics" ? null : e.target.value)}
              style={{
                width: "100%",
                maxWidth: 400,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                fontSize: 14,
                color: "#111827",
                background: "white",
                cursor: "pointer",
                fontFamily: "inherit",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: 36,
              }}
            >
              <option value="All Topics">All Topics</option>
              <option value="States of Matter">States of Matter</option>
              <option value="Atoms, Elements and Compounds">Atoms, Elements and Compounds</option>
              <option value="Stoichiometry">Stoichiometry</option>
              <option value="Electrochemistry">Electrochemistry</option>
              <option value="Chemical Energetics">Chemical Energetics</option>
              <option value="Chemical Reactions">Chemical Reactions</option>
              <option value="Acids, Bases and Salts">Acids, Bases and Salts</option>
              <option value="The Periodic Table">The Periodic Table</option>
              <option value="Metals">Metals</option>
              <option value="Chemistry of the Environment">Chemistry of the Environment</option>
              <option value="Organic Chemistry">Organic Chemistry</option>
              <option value="Experimental Techniques & Analysis">Experimental Techniques & Analysis</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>
              Type
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["All", "MCQ", "Theory", "Practical"].map((type) => {
                const palette =
                  type === "All"
                    ? { bg: "#e8f8f4", border: "#189080", text: "#189080" }
                    : QUESTION_TYPE_COLORS[type.toLowerCase()];
                const isHighlighted = activeType === type || hoveredType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    onMouseEnter={() => setHoveredType(type)}
                    onMouseLeave={() => setHoveredType(null)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      background: isHighlighted ? palette.bg : "white",
                      color: isHighlighted ? palette.text : "#6b7280",
                      border: `1.5px solid ${isHighlighted ? palette.border : "#d1d5db"}`,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 2 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>
              Difficulty
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["All", "Easy", "Medium", "Hard"].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setActiveDiff(diff)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: activeDiff === diff ? "#189080" : "white",
                    color: activeDiff === diff ? "white" : "#189080",
                    border: "1.5px solid #189080"
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
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
              const typeStyle =
                QUESTION_TYPE_COLORS[(q.paper_type ?? "MCQ").toLowerCase()] ?? QUESTION_TYPE_COLORS.mcq;
              return (
                <div
                  key={q.id}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    borderLeft: `4px solid ${typeStyle.border}`,
                    padding: "14px 16px",
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
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
                    <span
                      style={{
                        fontSize: 10,
                        color: "#92400e",
                        background: "#fff7ed",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontWeight: 700,
                      }}
                    >
                      Expert
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                      {q.marks} mark{q.marks !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Topic */}
                  <p style={{ fontSize: 12, fontWeight: 600, color: typeStyle.text, margin: "0 0 8px" }}>
                    {q.topic} {q.subtopic ? `· ${q.subtopic}` : ""}
                  </p>

                  {/* Question preview */}
                  {q.diagram_url && (
                    <div
                      style={{
                        marginBottom: 12,
                        borderRadius: 10,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <img
                        src={q.diagram_url}
                        alt="Question diagram"
                        style={{ width: "100%", display: "block" }}
                      />
                    </div>
                  )}
                  <p
                    style={{
                      fontSize: 13,
                      color: "#1f2937",
                      lineHeight: 1.6,
                      margin: "0 0 12px",
                      fontWeight: 400,
                    }}
                  >
                    {q.question_text}
                  </p>

                  {/* Attempt button */}
                  <Link
                    href={`/question?id=${encodeURIComponent(String(q.id))}`}
                    style={{
                      display: "inline-block",
                      background: typeStyle.bg,
                      color: typeStyle.text,
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      border: `1px solid ${typeStyle.border}`,
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

        <div style={{ margin: "14px 0 6px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "MCQ", color: QUESTION_TYPE_COLORS.mcq.border },
            { label: "Theory", color: QUESTION_TYPE_COLORS.theory.border },
            { label: "Practical", color: QUESTION_TYPE_COLORS.practical.border },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>
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
