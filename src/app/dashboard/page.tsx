"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { getTrialInfo } from "@/lib/trialStatus";

const SUBJECTS = [
  { name: "Chemistry", code: "0620", color: "#189080" },
  { name: "Physics", code: "0625", color: "#137265" },
  { name: "Mathematics", code: "0580", color: "#f5731e" },
];

const TABS = ["Today", "My Plan", "Subjects", "Progress"] as const;
type Tab = (typeof TABS)[number];

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

function getDaysRemaining(session: string, year: number): number {
  const month = session === "May/June" ? 4 : 9;
  const exam = new Date(year, month, 15);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
}

function getMode(days: number): { label: string; color: string; bg: string; emoji: string } {
  if (days <= 28) return { label: "Crash Mode", color: "#dc2626", bg: "#fef2f2", emoji: "🚨" };
  if (days <= 60) return { label: "Rapid Mode", color: "#d97706", bg: "#fffbeb", emoji: "⚡" };
  return { label: "Full Course", color: "#189080", bg: "#e8f8f4", emoji: "📚" };
}

function isToday(d: string) {
  return d === new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return {
    day: dt.toLocaleDateString("en-GB", { weekday: "short" }),
    date: dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  };
}

const ACTIVITY_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  learn: { text: "#189080", bg: "#e8f8f4", border: "#a7f3d0" },
  practice: { text: "#f5731e", bg: "#fff7ed", border: "#fed7aa" },
  revision: { text: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  mock: { text: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  past_paper: { text: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

function normalizeSessions(rows: unknown[] | null): PlanSession[] {
  if (!rows?.length) return [];
  return rows.map((raw, idx) => {
    const r = raw as Record<string, unknown>;
    const id = r.id != null ? String(r.id) : `${String(r.scheduled_date)}-${String(r.topic)}-${idx}`;
    const mode = String(r.mode ?? "learn");
    return {
      id,
      scheduled_date: String(r.scheduled_date ?? ""),
      topic: String(r.topic ?? ""),
      subtopic: String(r.subtopic ?? ""),
      mode,
      activity_type: r.activity_type != null ? String(r.activity_type) : undefined,
      duration_minutes: Number(r.duration_minutes ?? 45),
      priority: r.priority != null ? String(r.priority) : undefined,
      completed: Boolean(r.completed),
      week_number: r.week_number != null ? Number(r.week_number) : undefined,
    };
  });
}

export default function DashboardPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("Student");
  const [examSession, setExamSession] = useState("May/June");
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear() + 1);
  const [targetGrade, setTargetGrade] = useState("");
  const [subject, setSubject] = useState("Chemistry");
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Today");
  const [trial, setTrial] = useState(() => getTrialInfo());

  const [sessions, setSessions] = useState<PlanSession[]>([]);
  const [subjectMastery, setSubjectMastery] = useState<Record<string, number>>({});
  const [topicScores, setTopicScores] = useState<Array<{ subject: string; topic: string; mastery: number }>>([]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const meta = user.user_metadata ?? {};
      const name =
        meta.child_name && meta.child_name !== "###"
          ? meta.child_name
          : meta.name && meta.name !== "###"
            ? meta.name
            : user.email?.split("@")[0] ?? "Student";

      setStudentName(String(name));
      setStudentId(user.id);
      setTrial(getTrialInfo());
      setChecking(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from("students")
      .select("onboarding_complete")
      .eq("id", studentId)
      .single()
      .then(({ data }) => {
        if (!data?.onboarding_complete) router.push("/subjects");
      });
  }, [studentId, router]);

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from("students")
      .select("name, target_grade, exam_session, exam_year, onboarding_subject")
      .eq("id", studentId)
      .single()
      .then(({ data }) => {
        if (data?.target_grade) setTargetGrade(String(data.target_grade));
        if (data?.exam_session) setExamSession(String(data.exam_session));
        if (data?.exam_year) setExamYear(Number(data.exam_year));
        if (data?.onboarding_subject) setSubject(String(data.onboarding_subject));
      });
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from("topic_scores")
      .select("subject, topic, mastery")
      .eq("student_id", studentId)
      .then(({ data }) => {
        if (!data) return;
        const rows = data as Array<{ subject: string; topic: string; mastery: number }>;
        setTopicScores(rows);
        const grouped: Record<string, number[]> = {};
        rows.forEach((r) => {
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

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from("study_plan")
      .select("id, scheduled_date, topic, subtopic, mode, priority, completed, week_number, day_number")
      .eq("student_id", studentId)
      .order("scheduled_date", { ascending: true })
      .order("day_number", { ascending: true })
      .then(({ data }) => {
        if (data) setSessions(normalizeSessions(data as unknown[]));
      });
  }, [studentId]);

  const daysLeft = getDaysRemaining(examSession, examYear);
  const modeInfo = getMode(daysLeft);
  const todaySession = sessions.find((s) => isToday(s.scheduled_date) && !s.completed);
  const nextSession = sessions.find((s) => !s.completed);
  const completedCount = sessions.filter((s) => s.completed).length;
  const avatarLetter = studentName.trim().charAt(0).toUpperCase() || "S";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const sidebarNav = useMemo(
    () =>
      TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
            activeTab === tab ? "bg-teal-50 font-semibold text-brand-teal" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {tab}
        </button>
      )),
    [activeTab],
  );

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e5e7eb",
              borderTop: "3px solid #189080",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#6b7280", fontSize: 14 }}>Loading your dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0faf8] lg:flex">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-teal-100 bg-white shadow-sm lg:flex">
        <div className="border-b border-slate-100 p-4">
          <Logo className="text-xl" />
        </div>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-brand-teal">
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">Student</p>
            <p className="truncate font-semibold text-slate-900">{studentName}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4">{sidebarNav}</nav>
        <div className="space-y-1 border-t border-slate-100 p-3">
          <Link
            href="/account"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Account
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </aside>

      <main
        className="w-full pb-20 lg:ml-[240px] lg:min-h-screen lg:pb-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Top hero bar ── */}
        <div className="lg:px-4 lg:pt-4">
          <div
            className="lg:mx-auto lg:max-w-[720px] lg:overflow-hidden lg:rounded-2xl lg:shadow-md"
            style={{ background: "#189080", padding: "20px 20px 28px", position: "relative" }}
          >
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <Logo className="text-2xl" />
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowMenu((p) => !p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: 12,
                    padding: "6px 10px",
                    cursor: "pointer",
                    color: "white",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{studentName}</span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {avatarLetter}
                  </div>
                </button>
                {showMenu && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 44,
                      background: "white",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      padding: 6,
                      zIndex: 50,
                      minWidth: 140,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    <Link
                      href="/account"
                      style={{
                        display: "block",
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#374151",
                        textDecoration: "none",
                        borderRadius: 8,
                      }}
                    >
                      ⚙️ Account
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#dc2626",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: 8,
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h1
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "white",
                margin: "0 0 4px",
              }}
              className="lg:text-lg"
            >
              {(() => {
                const h = new Date().getHours();
                return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
              })()}
              , {studentName}! 👋
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: "0 0 16px" }} className="lg:text-xs">
              {subject} · {targetGrade ? `Targeting Grade ${targetGrade}` : ""} · {examSession} {examYear}
            </p>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}
              className="lg:max-w-xl lg:mx-auto"
            >
              {[
                { label: "Days Left", value: String(daysLeft) },
                { label: "Sessions", value: `${completedCount}/${sessions.length}` },
                { label: modeInfo.label, value: modeInfo.emoji },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 12,
                    padding: "10px 8px",
                    textAlign: "center",
                  }}
                  className="lg:py-2 lg:px-2"
                >
                  <p style={{ fontSize: 18, fontWeight: 700, color: "white", margin: 0 }} className="lg:text-base">
                    {stat.value}
                  </p>
                  <p
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}
                    className="lg:text-[10px]"
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {trial.status === "Free Trial" && (
          <div
            className="lg:mx-auto lg:max-w-[720px] lg:px-4"
            style={{
              background: "#fff7ed",
              borderBottom: "1px solid #fed7aa",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>
              🎁 Free trial · <strong>{trial.daysRemaining} days left</strong>
            </p>
            <Link href="/pricing" style={{ fontSize: 12, fontWeight: 700, color: "#f5731e", textDecoration: "none" }}>
              Upgrade →
            </Link>
          </div>
        )}

        <div
          className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden"
          style={{ display: "flex", paddingLeft: 16, paddingRight: 16 }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "13px 4px",
                fontSize: 13,
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? "#189080" : "#9ca3af",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab ? "2.5px solid #189080" : "2.5px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full px-4 pb-4 pt-4 lg:mx-auto lg:max-w-[720px]">
          {activeTab === "Today" && (
            <div>
              {todaySession || nextSession ? (
                (() => {
                  const s = todaySession ?? nextSession!;
                  const actKey = (s.activity_type ?? s.mode).replace(/-/g, "_");
                  const actStyle = ACTIVITY_STYLE[actKey] ?? ACTIVITY_STYLE.learn;
                  const isUpcoming = !todaySession && !!nextSession;
                  return (
                    <div
                      style={{
                        background: "white",
                        border: `2px solid #189080`,
                        borderRadius: 16,
                        padding: "18px 16px",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#189080",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            margin: 0,
                          }}
                        >
                          {isUpcoming
                            ? `📅 Next Session · ${fmtDate(s.scheduled_date).day} ${fmtDate(s.scheduled_date).date}`
                            : "📅 Today\u2019s Session"}
                        </p>
                        <span
                          style={{
                            background: modeInfo.bg,
                            color: modeInfo.color,
                            borderRadius: 20,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {modeInfo.emoji} {modeInfo.label}
                        </span>
                      </div>

                      <p
                        style={{
                          fontFamily: "'Sora', sans-serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#0f172a",
                          margin: "0 0 4px",
                        }}
                      >
                        {s.topic}
                      </p>
                      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>{s.subtopic}</p>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <span
                          style={{
                            background: actStyle.bg,
                            color: actStyle.text,
                            border: `1px solid ${actStyle.border}`,
                            borderRadius: 20,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {(s.activity_type ?? s.mode).replace("_", " ")}
                        </span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>⏱ {s.duration_minutes} min</span>
                        {s.priority === "must_cover" && (
                          <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>🎯 Must Cover</span>
                        )}
                      </div>

                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 10,
                          padding: "10px 12px",
                          marginBottom: 16,
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#374151",
                            margin: "0 0 8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          How it works
                        </p>
                        {[
                          { n: "1", text: "Your personal tutor explains the topic" },
                          { n: "2", text: "You answer practice questions" },
                          { n: "3", text: "Get expert marking + feedback" },
                        ].map((step) => (
                          <div key={step.n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "#189080",
                                color: "white",
                                fontSize: 10,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {step.n}
                            </div>
                            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{step.text}</p>
                          </div>
                        ))}
                      </div>

                      <Link
                        href={`/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(s.topic)}`}
                        style={{
                          display: "block",
                          background: "#189080",
                          color: "white",
                          borderRadius: 12,
                          padding: "14px",
                          textAlign: "center",
                          fontFamily: "'Sora', sans-serif",
                          fontSize: 15,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Start Session →
                      </Link>
                    </div>
                  );
                })()
              ) : (
                <div
                  style={{
                    background: "white",
                    borderRadius: 16,
                    padding: 24,
                    textAlign: "center",
                    marginBottom: 16,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ fontSize: 32, margin: "0 0 8px" }}>🎉</p>
                  <p
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0f172a",
                      margin: "0 0 4px",
                    }}
                  >
                    All caught up!
                  </p>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                    No sessions scheduled today. Check your full plan.
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { emoji: "📋", label: "Full Plan", href: "/study-plan" },
                  { emoji: "📊", label: "My Progress", href: "/progress" },
                  { emoji: "🔮", label: "SmartPredict", href: "/predict" },
                  { emoji: "💬", label: "Ask Tutor", href: "/tutor" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    style={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "14px",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeTab === "My Plan" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {subject} Plan
                </h2>
                <Link href="/study-plan" style={{ fontSize: 12, fontWeight: 600, color: "#189080", textDecoration: "none" }}>
                  Edit plan →
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div
                  style={{
                    background: "white",
                    borderRadius: 12,
                    padding: 24,
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No plan generated yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessions.map((s, idx) => {
                    const df = fmtDate(s.scheduled_date);
                    const today = isToday(s.scheduled_date);
                    const actKey = (s.activity_type ?? s.mode).replace(/-/g, "_");
                    const actStyle = ACTIVITY_STYLE[actKey] ?? ACTIVITY_STYLE.learn;
                    return (
                      <div
                        key={s.id}
                        style={{
                          background: today ? "#f0fdf9" : s.completed ? "#f8fafc" : "white",
                          border: `1.5px solid ${today ? "#189080" : "#e5e7eb"}`,
                          borderRadius: 12,
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          opacity: s.completed ? 0.65 : 1,
                        }}
                      >
                        <div style={{ textAlign: "center", minWidth: 36, flexShrink: 0 }}>
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: today ? "#189080" : "#9ca3af",
                              margin: 0,
                              textTransform: "uppercase",
                            }}
                          >
                            {df.day}
                          </p>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: today ? "#189080" : "#374151",
                              margin: 0,
                            }}
                          >
                            {df.date.split(" ")[0]}
                          </p>
                          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{df.date.split(" ")[1]}</p>
                        </div>
                        <div style={{ width: 1, height: 40, background: today ? "#a7f3d0" : "#e5e7eb", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0f172a",
                              margin: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {idx + 1}. {s.topic}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                              margin: "1px 0 0",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.subtopic}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              background: actStyle.bg,
                              color: actStyle.text,
                              border: `1px solid ${actStyle.border}`,
                              borderRadius: 20,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
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

          {activeTab === "Subjects" && (
            <div>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 14px",
                }}
              >
                Your Subjects
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {SUBJECTS.map((sub) => {
                  const mastery = subjectMastery[sub.name] ?? 0;
                  return (
                    <div
                      key={sub.code}
                      style={{
                        background: "white",
                        borderRadius: 16,
                        padding: "16px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontFamily: "'Sora', sans-serif",
                              fontSize: 16,
                              fontWeight: 700,
                              color: "#0f172a",
                              margin: 0,
                            }}
                          >
                            {sub.name}
                          </p>
                          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>IGCSE {sub.code}</p>
                        </div>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: sub.color + "18",
                            border: `2px solid ${sub.color}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: sub.color,
                          }}
                        >
                          {mastery}%
                        </div>
                      </div>
                      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 6, marginBottom: 12 }}>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 6,
                            background: sub.color,
                            width: `${mastery}%`,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Link
                          href={`/learn/${encodeURIComponent(sub.name.toLowerCase())}`}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: "9px",
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#374151",
                            textDecoration: "none",
                          }}
                        >
                          📖 Learn
                        </Link>
                        <Link
                          href={`/practice?subject=${encodeURIComponent(sub.name)}`}
                          style={{
                            background: sub.color,
                            borderRadius: 8,
                            padding: "9px",
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "white",
                            textDecoration: "none",
                          }}
                        >
                          ✏️ Practice
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "Progress" && (
            <div>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 14px",
                }}
              >
                Your Progress
              </h2>

              <div
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Study Plan</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#189080", margin: 0 }}>
                    {completedCount}/{sessions.length} sessions
                  </p>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 8 }}>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 8,
                      background: "#189080",
                      width: sessions.length ? `${(completedCount / sessions.length) * 100}%` : "0%",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>

              {topicScores.length === 0 ? (
                <div
                  style={{
                    background: "white",
                    borderRadius: 12,
                    padding: 24,
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                    No mastery data yet. Complete some practice sessions to see your progress.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topicScores.slice(0, 10).map((t, i) => (
                    <div
                      key={`${t.subject}-${t.topic}-${i}`}
                      style={{
                        background: "white",
                        borderRadius: 12,
                        padding: "12px 14px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{t.topic}</p>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }}>{t.subject}</p>
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: t.mastery >= 70 ? "#16a34a" : t.mastery >= 40 ? "#d97706" : "#dc2626",
                          }}
                        >
                          {Math.round(t.mastery)}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4 }}>
                        <div
                          style={{
                            height: 4,
                            borderRadius: 4,
                            background: t.mastery >= 70 ? "#16a34a" : t.mastery >= 40 ? "#d97706" : "#dc2626",
                            width: `${t.mastery}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/progress"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#189080",
                      textDecoration: "none",
                    }}
                  >
                    View full progress report →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </main>
    </div>
  );
}
