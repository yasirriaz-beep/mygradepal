"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getTrialInfo } from "@/lib/trialStatus";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL   = "#189080";
const ORANGE = "#f5731e";

const IGCSE_SUBJECTS = [
  { name: "Chemistry",        code: "0620", color: TEAL,    emoji: "⚗️"  },
  { name: "Physics",          code: "0625", color: "#137265", emoji: "⚡"  },
  { name: "Mathematics",      code: "0580", color: ORANGE,  emoji: "📐"  },
  { name: "Biology",          code: "0610", color: "#16a34a", emoji: "🧬"  },
  { name: "English",          code: "0510", color: "#2563eb", emoji: "📝"  },
  { name: "Pakistan Studies", code: "0448", color: "#7c3aed", emoji: "🗺️"  },
];

const TABS = [
  { id: "today",    label: "Today",    emoji: "📅" },
  { id: "plan",     label: "My Plan",  emoji: "📋" },
  { id: "learn",    label: "Learn",    emoji: "📖" },
  { id: "practice", label: "Practice", emoji: "✏️" },
  { id: "predict",  label: "Predict",  emoji: "🔮" },
  { id: "progress", label: "Progress", emoji: "📊" },
] as const;

type TabId = typeof TABS[number]["id"];

const ACTIVITY_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  learn:    { text: TEAL,     bg: "#e8f8f4", border: "#a7f3d0" },
  practice: { text: ORANGE,   bg: "#fff7ed", border: "#fed7aa" },
  revision: { text: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  mock:     { text: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const TOPIC_FREQUENCY: Record<string, Array<{ topic: string; pct: number }>> = {
  Chemistry:   [
    { topic: "Stoichiometry",          pct: 94 },
    { topic: "Electrochemistry",       pct: 88 },
    { topic: "Organic Chemistry",      pct: 76 },
    { topic: "Acids, Bases and Salts", pct: 71 },
    { topic: "Atomic Structure",       pct: 68 },
    { topic: "Rates of Reaction",      pct: 61 },
    { topic: "Energy Changes",         pct: 58 },
  ],
  Physics:     [
    { topic: "Forces and Motion", pct: 92 },
    { topic: "Electricity",       pct: 87 },
    { topic: "Waves",             pct: 74 },
    { topic: "Thermal Physics",   pct: 69 },
    { topic: "Magnetism",         pct: 55 },
  ],
  Mathematics: [
    { topic: "Algebra",       pct: 96 },
    { topic: "Geometry",      pct: 89 },
    { topic: "Statistics",    pct: 78 },
    { topic: "Trigonometry",  pct: 72 },
    { topic: "Number",        pct: 65 },
  ],
  Biology: [
    { topic: "Cell Biology", pct: 91 },
    { topic: "Genetics",     pct: 85 },
    { topic: "Respiration",  pct: 73 },
    { topic: "Ecology",      pct: 64 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(session: string, year: number) {
  const month = session === "May/June" ? 4 : 9;
  const exam  = new Date(year, month, 15);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
}

function getModeInfo(days: number) {
  if (days <= 28) return { label: "Crash Mode",  emoji: "🚨", color: "#dc2626", bg: "#fef2f2" };
  if (days <= 60) return { label: "Rapid Mode",  emoji: "⚡", color: "#d97706", bg: "#fffbeb" };
  return               { label: "Full Course", emoji: "📚", color: TEAL,     bg: "#e8f8f4" };
}

function isToday(d: string) {
  return d === new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return {
    day:  dt.toLocaleDateString("en-GB", { weekday: "short" }),
    date: dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  };
}

function freqEmoji(pct: number) {
  if (pct >= 85) return "🔥";
  if (pct >= 65) return "⚡";
  return "✓";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanSession {
  id: string;
  scheduled_date: string;
  topic: string;
  subtopic: string;
  mode: string;
  activity_type?: string;
  duration_minutes: number;
  priority?: string;
  completed: boolean;
  week_number?: number;
}

interface TopicScore {
  subject: string;
  topic: string;
  mastery: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  // Auth + profile
  const [checking,     setChecking]     = useState(true);
  const [studentId,    setStudentId]    = useState<string | null>(null);
  const [studentName,  setStudentName]  = useState("Student");
  const [examSession,  setExamSession]  = useState("May/June");
  const [examYear,     setExamYear]     = useState(new Date().getFullYear() + 1);
  const [targetGrade,  setTargetGrade]  = useState("");
  const [subject,      setSubject]      = useState("Chemistry");
  const [showMenu,     setShowMenu]     = useState(false);
  const [trial,        setTrial]        = useState(() => getTrialInfo());
  const [activeTab,    setActiveTab]    = useState<TabId>("today");

  // Data
  const [sessions,      setSessions]      = useState<PlanSession[]>([]);
  const [topicScores,   setTopicScores]   = useState<TopicScore[]>([]);
  const [subjectMastery, setSubjectMastery] = useState<Record<string, number>>({});

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { router.push("/login"); return; }

      if (typeof window !== "undefined" && localStorage.getItem("mgp_onboarded") !== "true") {
        router.push("/onboarding");
        return;
      }

      const meta = user.user_metadata ?? {};
      const name =
        (meta.child_name && meta.child_name !== "###") ? meta.child_name :
        (meta.name       && meta.name       !== "###") ? meta.name :
        user.email?.split("@")[0] ?? "Student";

      setStudentName(String(name));
      setStudentId(user.id);
      setTrial(getTrialInfo());
      setChecking(false);
    };
    void init();
  }, [router]);

  // ── Redirect if not onboarded ───────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    supabase.from("students")
      .select("onboarding_complete, target_grade, exam_session, exam_year, onboarding_subject")
      .eq("id", studentId).single()
      .then(({ data }) => {
        if (!data) return;
        if (data.target_grade)       setTargetGrade(String(data.target_grade));
        if (data.exam_session)       setExamSession(String(data.exam_session));
        if (data.exam_year)          setExamYear(Number(data.exam_year));
        if (data.onboarding_subject) setSubject(String(data.onboarding_subject));
      });
  }, [studentId, router]);

  // ── Load mastery ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    supabase.from("topic_scores")
      .select("subject, topic, mastery")
      .eq("student_id", studentId)
      .then(({ data }) => {
        if (!data) return;
        const rows = data as TopicScore[];
        setTopicScores(rows);
        const grouped: Record<string, number[]> = {};
        rows.forEach(r => {
          if (!grouped[r.subject]) grouped[r.subject] = [];
          grouped[r.subject].push(Math.min(100, Math.max(0, r.mastery)));
        });
        const avgs: Record<string, number> = {};
        Object.entries(grouped).forEach(([s, v]) => {
          avgs[s] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
        });
        setSubjectMastery(avgs);
      });
  }, [studentId]);

  // ── Load study plan ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    supabase.from("study_plan")
      .select("id, scheduled_date, topic, subtopic, mode, activity_type, duration_minutes, priority, completed, week_number")
      .eq("student_id", studentId)
      .order("scheduled_date", { ascending: true })
      .order("day_number",     { ascending: true })
      .then(({ data }) => { if (data) setSessions(data as PlanSession[]); });
  }, [studentId]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const daysLeft       = getDaysLeft(examSession, examYear);
  const modeInfo       = getModeInfo(daysLeft);
  const todaySession   = sessions.find(s => isToday(s.scheduled_date) && !s.completed);
  const nextSession    = sessions.find(s => !s.completed);
  const completedCount = sessions.filter(s => s.completed).length;
  const avatarLetter   = studentName.trim().charAt(0).toUpperCase() || "S";
  const freqTopics     = TOPIC_FREQUENCY[subject] ?? [];
  const weakTopics     = [...topicScores]
    .filter(t => t.subject === subject)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0faf8" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTop: `3px solid ${TEAL}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#6b7280", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── DESKTOP LAYOUT WRAPPER ── */}
      <div className="lg:flex lg:min-h-screen">

        {/* ════════════════════════════════
            LEFT SIDEBAR (desktop only)
        ════════════════════════════════ */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-200 lg:z-40">
          {/* Logo */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <Logo className="text-2xl" />
          </div>

          {/* Student info */}
          <div style={{ padding: "14px 20px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e8f8f4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: TEAL, flexShrink: 0 }}>
              {avatarLetter}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{studentName}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{subject} · Grade {targetGrade}</p>
            </div>
          </div>

          {/* Exam countdown */}
          <div style={{ margin: "12px 16px", background: modeInfo.bg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${modeInfo.color}20` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: modeInfo.color, margin: "0 0 2px" }}>{modeInfo.emoji} {modeInfo.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: modeInfo.color, margin: 0 }}>{daysLeft} <span style={{ fontSize: 12, fontWeight: 400 }}>days to exam</span></p>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: "8px 12px" }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 12px",
                  borderRadius: 10,
                  background: activeTab === tab.id ? "#e8f8f4" : "transparent",
                  color: activeTab === tab.id ? TEAL : "#6b7280",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                  marginBottom: 2,
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Bottom links */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
            <Link href="/onboarding" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 2 }}>
              📘 How to use
            </Link>
            <Link href="/account" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 2 }}>
              ⚙️ Account
            </Link>
            <button onClick={() => void handleSignOut()} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, fontSize: 13, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
              🚪 Logout
            </button>
          </div>
        </aside>

        {/* ════════════════════════════════
            MAIN CONTENT AREA
        ════════════════════════════════ */}
        <main className="lg:ml-60 lg:flex-1" style={{ paddingBottom: 80 }}>

          {/* ── MOBILE HEADER ── */}
          <div className="lg:hidden" style={{ background: TEAL, padding: "16px 16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Logo className="text-2xl" />
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowMenu(p => !p)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: "white" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{studentName}</span>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                    {avatarLetter}
                  </div>
                </button>
                {showMenu && (
                  <div style={{ position: "absolute", right: 0, top: 44, background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 6, zIndex: 50, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                    <Link href="/onboarding" style={{ display: "block", padding: "8px 12px", fontSize: 13, color: "#374151", textDecoration: "none" }}>📘 How to use</Link>
                    <Link href="/account" style={{ display: "block", padding: "8px 12px", fontSize: 13, color: "#374151", textDecoration: "none" }}>⚙️ Account</Link>
                    <button onClick={() => void handleSignOut()} style={{ width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile greeting + stats */}
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: "0 0 4px" }}>
              {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })()}, {studentName}! 👋
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "0 0 14px" }}>
              {subject} · {targetGrade ? `Grade ${targetGrade} target` : ""} · {examSession} {examYear}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Days Left",  value: String(daysLeft) },
                { label: "Sessions",   value: `${completedCount}/${sessions.length}` },
                { label: modeInfo.label, value: modeInfo.emoji },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.18)", borderRadius: 10, padding: "9px 6px", textAlign: "center" }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "white", margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", margin: "2px 0 0" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── DESKTOP GREETING BAR ── */}
          <div className="hidden lg:block" style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>
                {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })()}, {studentName}! 👋
              </h1>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                {subject} · {targetGrade ? `Targeting Grade ${targetGrade}` : ""} · {examSession} {examYear}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ background: modeInfo.bg, borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: modeInfo.color, margin: 0 }}>{daysLeft}</p>
                <p style={{ fontSize: 10, color: modeInfo.color, margin: 0 }}>days left</p>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#374151", margin: 0 }}>{completedCount}/{sessions.length}</p>
                <p style={{ fontSize: 10, color: "#6b7280", margin: 0 }}>sessions done</p>
              </div>
            </div>
          </div>

          {/* ── TRIAL BANNER ── */}
          {trial.status === "Free Trial" && (
            <div style={{ background: "#fff7ed", borderBottom: "1px solid #fed7aa", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>🎁 Free trial · <strong>{trial.daysRemaining} days left</strong></p>
              <Link href="/pricing" style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textDecoration: "none" }}>Upgrade →</Link>
            </div>
          )}

          {/* ── MOBILE TAB BAR ── */}
          <div className="lg:hidden" style={{ background: "white", borderBottom: "1px solid #e5e7eb", display: "flex", overflowX: "auto", position: "sticky", top: 0, zIndex: 40 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: "0 0 auto",
                  padding: "14px 16px",
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? TEAL : "#9ca3af",
                  background: "none",
                  border: "none",
                  borderBottom: `3px solid ${activeTab === tab.id ? TEAL : "transparent"}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="lg:max-w-3xl lg:mx-auto" style={{ padding: "20px 16px 0" }}>

            {/* ══════════════════════════
                TODAY TAB
            ══════════════════════════ */}
            {activeTab === "today" && (() => {
              const s = todaySession ?? nextSession;
              return (
                <div>
                  {s ? (
                    <div style={{ background: "white", border: `2px solid ${TEAL}`, borderRadius: 18, padding: "20px 18px", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                          {todaySession ? "📅 Today's Session" : `📅 Next · ${fmtDate(s.scheduled_date).day} ${fmtDate(s.scheduled_date).date}`}
                        </p>
                        <span style={{ background: modeInfo.bg, color: modeInfo.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                          {modeInfo.emoji} {modeInfo.label}
                        </span>
                      </div>

                      <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                        {s.topic}
                      </p>
                      <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 14px" }}>{s.subtopic}</p>

                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 18 }}>
                        {(() => {
                          const as = ACTIVITY_STYLE[s.activity_type ?? s.mode] ?? ACTIVITY_STYLE.learn;
                          return (
                            <span style={{ background: as.bg, color: as.text, border: `1px solid ${as.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                              {(s.activity_type ?? s.mode).replace("_", " ")}
                            </span>
                          );
                        })()}
                        <span style={{ fontSize: 13, color: "#6b7280" }}>⏱ {s.duration_minutes} min</span>
                        {s.priority === "must_cover" && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>🎯 Must Cover</span>}
                      </div>

                      {/* How it works — shown always to reinforce the flow */}
                      <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", marginBottom: 18, border: "1px solid #e5e7eb" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          How a session works
                        </p>
                        {[
                          { n: "1", label: "Learn",    desc: "Your personal tutor explains the topic with examples",   href: `/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(s.topic)}`,    color: TEAL    },
                          { n: "2", label: "Practice", desc: "Answer past paper questions on this topic",              href: `/practice?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(s.topic)}`, color: ORANGE  },
                          { n: "3", label: "Review",   desc: "Get expert marking and see where you went wrong",        href: `/progress`,                                                                              color: "#7c3aed" },
                        ].map(step => (
                          <Link key={step.n} href={step.href} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, textDecoration: "none" }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: step.color, color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {step.n}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{step.label}</p>
                              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{step.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>

                      <Link
                        href={`/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(s.topic)}`}
                        style={{ display: "block", background: TEAL, color: "white", borderRadius: 12, padding: "15px", textAlign: "center", fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, textDecoration: "none" }}
                      >
                        Start Session →
                      </Link>
                    </div>
                  ) : (
                    <div style={{ background: "white", borderRadius: 18, padding: 28, textAlign: "center", marginBottom: 16, border: "1px solid #e5e7eb" }}>
                      <p style={{ fontSize: 36, margin: "0 0 10px" }}>🎉</p>
                      <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>All caught up!</p>
                      <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>No sessions scheduled. Check your full plan or explore freely.</p>
                      <Link href="/study-plan" style={{ display: "inline-block", background: TEAL, color: "white", borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        View full plan →
                      </Link>
                    </div>
                  )}

                  {/* Quick access grid */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Quick Access</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                      { emoji: "📋", label: "Full Plan",    sub: "Day-by-day schedule",   href: "/study-plan"  },
                      { emoji: "🔮", label: "SmartPredict", sub: "Hot topics for exam",    href: "/predict"     },
                      { emoji: "💬", label: "Ask Tutor",    sub: "Get help on any topic",  href: "/tutor"       },
                      { emoji: "📊", label: "Progress",     sub: "See your mastery scores", href: "/progress"   },
                    ].map(item => (
                      <Link key={item.label} href={item.href} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "14px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{item.label}</p>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{item.sub}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ══════════════════════════
                MY PLAN TAB
            ══════════════════════════ */}
            {activeTab === "plan" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>{subject} Plan</h2>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{completedCount} of {sessions.length} sessions complete</p>
                  </div>
                  <Link href="/study-plan" style={{ background: TEAL, color: "white", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    ✏️ Edit plan
                  </Link>
                </div>

                {/* Progress bar */}
                <div style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 14, border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>Overall Progress</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: TEAL, margin: 0 }}>{sessions.length ? Math.round((completedCount / sessions.length) * 100) : 0}%</p>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 8 }}>
                    <div style={{ height: 8, borderRadius: 8, background: TEAL, width: sessions.length ? `${(completedCount / sessions.length) * 100}%` : "0%", transition: "width 0.6s" }} />
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <div style={{ background: "white", borderRadius: 14, padding: 24, textAlign: "center", border: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: 32, margin: "0 0 8px" }}>📋</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No plan yet</p>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>Complete onboarding to generate your personalised study plan.</p>
                    <Link href="/onboarding" style={{ display: "inline-block", background: TEAL, color: "white", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                      Build my plan →
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sessions.map((s, idx) => {
                      const df = fmtDate(s.scheduled_date);
                      const today = isToday(s.scheduled_date);
                      const as = ACTIVITY_STYLE[s.activity_type ?? s.mode] ?? ACTIVITY_STYLE.learn;
                      return (
                        <div key={s.id} style={{ background: today ? "#f0fdf9" : s.completed ? "#fafafa" : "white", border: `1.5px solid ${today ? TEAL : "#e5e7eb"}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, opacity: s.completed ? 0.6 : 1 }}>
                          <div style={{ textAlign: "center", minWidth: 36, flexShrink: 0 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: today ? TEAL : "#9ca3af", margin: 0, textTransform: "uppercase" }}>{df.day}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: today ? TEAL : "#374151", margin: 0 }}>{df.date.split(" ")[0]}</p>
                            <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{df.date.split(" ")[1]}</p>
                          </div>
                          <div style={{ width: 1, height: 40, background: today ? "#a7f3d0" : "#e5e7eb", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {idx + 1}. {s.topic}
                            </p>
                            <p style={{ fontSize: 11, color: "#6b7280", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.subtopic}</p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                            <span style={{ background: as.bg, color: as.text, border: `1px solid ${as.border}`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 600, textTransform: "capitalize" }}>
                              {(s.activity_type ?? s.mode).replace("_", " ")}
                            </span>
                            <span style={{ fontSize: 10, color: s.completed ? "#16a34a" : "#9ca3af", fontWeight: 600 }}>
                              {s.completed ? "✓ Done" : `${s.duration_minutes}m`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════
                LEARN TAB
            ══════════════════════════ */}
            {activeTab === "learn" && (
              <div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Learn</h2>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px" }}>
                  Structured notes, formulas, examples and past paper questions — all Cambridge-aligned.
                </p>

                {/* Subject selector */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
                  {IGCSE_SUBJECTS.map(sub => (
                    <button
                      key={sub.code}
                      onClick={() => setSubject(sub.name)}
                      style={{
                        flexShrink: 0,
                        padding: "8px 16px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        border: `1.5px solid ${subject === sub.name ? sub.color : "#e5e7eb"}`,
                        background: subject === sub.name ? sub.color + "18" : "white",
                        color: subject === sub.name ? sub.color : "#6b7280",
                        cursor: "pointer",
                      }}
                    >
                      {sub.emoji} {sub.name}
                    </button>
                  ))}
                </div>

                {/* Topic cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(TOPIC_FREQUENCY[subject] ?? []).map((t) => {
                    const mastery = topicScores.find(ts => ts.subject === subject && ts.topic === t.topic)?.mastery ?? 0;
                    const masteryColor = mastery >= 70 ? "#16a34a" : mastery >= 40 ? "#d97706" : "#dc2626";
                    return (
                      <div key={t.topic} style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                        <div style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{freqEmoji(t.pct)}</span>
                              <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{t.topic}</p>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: masteryColor, background: masteryColor + "15", borderRadius: 20, padding: "3px 8px" }}>
                              {mastery > 0 ? `${Math.round(mastery)}%` : "Not started"}
                            </span>
                          </div>
                          <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4, marginBottom: 12 }}>
                            <div style={{ height: 4, borderRadius: 4, background: masteryColor, width: `${mastery}%`, transition: "width 0.5s" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <Link href={`/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(t.topic)}`} style={{ background: "#e8f8f4", color: TEAL, borderRadius: 8, padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                              💬 Tutor
                            </Link>
                            <Link href={`/learn/${encodeURIComponent(subject.toLowerCase())}?topic=${encodeURIComponent(t.topic)}`} style={{ background: "#f8fafc", color: "#374151", borderRadius: 8, padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                              📖 Notes
                            </Link>
                            <Link href={`/practice?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(t.topic)}`} style={{ background: "#fff7ed", color: ORANGE, borderRadius: 8, padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                              ✏️ Practice
                            </Link>
                          </div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "8px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Appeared in {t.pct}% of past papers</p>
                          <span style={{ fontSize: 11, fontWeight: 600, color: t.pct >= 85 ? "#dc2626" : t.pct >= 65 ? "#d97706" : TEAL }}>
                            {t.pct >= 85 ? "🔥 Certain" : t.pct >= 65 ? "⚡ Likely" : "✓ Possible"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cambridge syllabus link */}
                <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", marginTop: 14, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🎓</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>Full Cambridge Syllabus</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>View the complete {subject} syllabus checklist</p>
                  </div>
                  <Link href={`/study/${encodeURIComponent(subject.toLowerCase())}`} style={{ background: TEAL, color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                    View →
                  </Link>
                </div>
              </div>
            )}

            {/* ══════════════════════════
                PRACTICE TAB
            ══════════════════════════ */}
            {activeTab === "practice" && (
              <div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Practice</h2>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px" }}>
                  Past paper questions filtered by topic. Get expert marking on every answer.
                </p>

                {/* Subject filter */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
                  {IGCSE_SUBJECTS.slice(0, 4).map(sub => (
                    <button key={sub.code} onClick={() => setSubject(sub.name)} style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${subject === sub.name ? sub.color : "#e5e7eb"}`, background: subject === sub.name ? sub.color + "18" : "white", color: subject === sub.name ? sub.color : "#6b7280", cursor: "pointer" }}>
                      {sub.emoji} {sub.name}
                    </button>
                  ))}
                </div>

                {/* Practice options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "By Topic",           sub: "Choose a specific topic to drill",             href: `/practice?subject=${encodeURIComponent(subject)}`,              emoji: "🎯" },
                    { label: "By Year",             sub: "Practice full past papers by year",            href: `/practice?subject=${encodeURIComponent(subject)}&filter=year`,   emoji: "📅" },
                    { label: "Weak Areas",          sub: "Questions on your lowest mastery topics",      href: `/practice?subject=${encodeURIComponent(subject)}&filter=weak`,   emoji: "💪" },
                    { label: "Random Mix",          sub: "Mixed questions across all topics",            href: `/practice?subject=${encodeURIComponent(subject)}&filter=random`, emoji: "🎲" },
                  ].map(opt => (
                    <Link key={opt.label} href={opt.href} style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb", textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{opt.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{opt.label}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{opt.sub}</p>
                      </div>
                      <span style={{ fontSize: 18, color: "#9ca3af" }}>→</span>
                    </Link>
                  ))}
                </div>

                {/* Weak topics to practice */}
                {weakTopics.length > 0 && (
                  <div style={{ background: "#fff7ed", borderRadius: 14, padding: "14px 16px", border: "1px solid #fed7aa" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      💪 Needs Work
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {weakTopics.map(t => (
                        <Link key={t.topic} href={`/practice?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{t.topic}</p>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", background: "#fef2f2", borderRadius: 20, padding: "2px 8px" }}>{Math.round(t.mastery)}%</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════
                PREDICT TAB
            ══════════════════════════ */}
            {activeTab === "predict" && (
              <div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>SmartPredict</h2>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px" }}>
                  Based on 15 years of Cambridge {subject} past papers.
                </p>
                <div style={{ background: "#e8f8f4", borderRadius: 10, padding: "8px 12px", marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>🎓</span>
                  <p style={{ fontSize: 11, fontWeight: 600, color: TEAL, margin: 0 }}>Cambridge O Level / IGCSE syllabus aligned</p>
                </div>

                {/* Frequency legend */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    { emoji: "🔥", label: "Certain",  desc: "85%+ papers",  color: "#dc2626" },
                    { emoji: "⚡", label: "Likely",   desc: "65–85%",       color: "#d97706" },
                    { emoji: "✓",  label: "Possible", desc: "Below 65%",    color: TEAL      },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{l.emoji}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: l.color, margin: 0 }}>{l.label}</p>
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{l.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subject selector */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
                  {IGCSE_SUBJECTS.slice(0, 4).map(sub => (
                    <button key={sub.code} onClick={() => setSubject(sub.name)} style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${subject === sub.name ? sub.color : "#e5e7eb"}`, background: subject === sub.name ? sub.color + "18" : "white", color: subject === sub.name ? sub.color : "#6b7280", cursor: "pointer" }}>
                      {sub.emoji} {sub.name}
                    </button>
                  ))}
                </div>

                {/* Topic frequency bars */}
                <div style={{ background: "white", borderRadius: 16, padding: "16px", marginBottom: 14, border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                    Topic Frequency — {subject}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {freqTopics.map(t => (
                      <div key={t.topic}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14 }}>{freqEmoji(t.pct)}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.topic}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: t.pct >= 85 ? "#dc2626" : t.pct >= 65 ? "#d97706" : TEAL }}>
                            {t.pct}%
                          </span>
                        </div>
                        <div style={{ height: 7, background: "#f3f4f6", borderRadius: 6 }}>
                          <div style={{ height: 7, borderRadius: 6, width: `${t.pct}%`, background: t.pct >= 85 ? "#dc2626" : t.pct >= 65 ? "#d97706" : TEAL, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate guess paper CTA */}
                <div style={{ background: `linear-gradient(135deg, ${TEAL}, #137265)`, borderRadius: 16, padding: "20px 18px", color: "white", marginBottom: 14 }}>
                  <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>📝 Generate Guess Paper</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: "0 0 16px", lineHeight: 1.5 }}>
                    AI-powered paper based on highest-probability topics. Cambridge format, full mark scheme.
                  </p>
                  <Link href={`/predict?subject=${encodeURIComponent(subject)}`} style={{ display: "inline-block", background: "white", color: TEAL, borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    Generate now →
                  </Link>
                </div>

                <Link href="/predict" style={{ display: "flex", background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb", textDecoration: "none", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🔮</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Full SmartPredict Page</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>Detailed analysis + mock paper generator</p>
                  </div>
                  <span style={{ fontSize: 18, color: "#9ca3af", marginLeft: "auto" }}>→</span>
                </Link>
              </div>
            )}

            {/* ══════════════════════════
                PROGRESS TAB
            ══════════════════════════ */}
            {activeTab === "progress" && (
              <div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 18px" }}>Your Progress</h2>

                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Sessions Done", value: String(completedCount),                                          color: TEAL   },
                    { label: "Plan Progress", value: sessions.length ? `${Math.round((completedCount/sessions.length)*100)}%` : "0%", color: ORANGE },
                    { label: "Days to Exam",  value: String(daysLeft),                                                color: modeInfo.color },
                  ].map(s => (
                    <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "14px 10px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                      <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0", lineHeight: 1.3 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Mastery by topic */}
                {topicScores.length === 0 ? (
                  <div style={{ background: "white", borderRadius: 14, padding: 24, textAlign: "center", border: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: 32, margin: "0 0 10px" }}>📊</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No data yet</p>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>Complete practice sessions to build your mastery scores.</p>
                    <Link href={`/practice?subject=${encodeURIComponent(subject)}`} style={{ display: "inline-block", background: TEAL, color: "white", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                      Start practising →
                    </Link>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Mastery by Topic</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {topicScores.slice(0, 8).map((t, i) => {
                        const color = t.mastery >= 70 ? "#16a34a" : t.mastery >= 40 ? "#d97706" : "#dc2626";
                        return (
                          <div key={i} style={{ background: "white", borderRadius: 12, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{t.topic}</p>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }}>{t.subject}</p>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color, background: color + "15", borderRadius: 20, padding: "3px 10px" }}>
                                {Math.round(t.mastery)}%
                              </span>
                            </div>
                            <div style={{ height: 5, background: "#f3f4f6", borderRadius: 4 }}>
                              <div style={{ height: 5, borderRadius: 4, background: color, width: `${t.mastery}%`, transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Link href="/progress" style={{ display: "block", textAlign: "center", padding: "13px", fontSize: 13, fontWeight: 600, color: TEAL, background: "white", borderRadius: 12, border: `1.5px solid ${TEAL}`, textDecoration: "none" }}>
                      View full progress report →
                    </Link>
                  </>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
