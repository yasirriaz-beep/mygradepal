"use client";

import Logo from "@/components/Logo";
import { useRouter } from "next/navigation";

const TEAL = "#1D9E75";

export default function OnboardingPage() {
  const router = useRouter();

  const handleStartChemistry = () => {
    localStorage.setItem("mgp_onboarded", "true");
    router.push("/learn/Chemistry");
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 96px" }}>
        <header style={{ background: "white", borderRadius: 16, padding: "20px 20px 18px", border: "1px solid #d1fae5", marginBottom: 16 }}>
          <Logo className="text-2xl" />
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "12px 0 6px" }}>
            Welcome to MyGradePal
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
            Your personalised IGCSE revision companion
          </p>
        </header>

        <section style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 18, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" }}>
            How it works
          </h2>

          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEAL, margin: "0 0 6px" }}>1. Choose your subject</p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 10px" }}>Start with Chemistry. More subjects coming soon.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ background: "#e8f8f4", color: TEAL, border: "1.5px solid #86efac", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Chemistry</span>
              <span style={{ background: "#f3f4f6", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Physics (coming soon)</span>
              <span style={{ background: "#f3f4f6", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Maths (coming soon)</span>
              <span style={{ background: "#f3f4f6", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Biology (coming soon)</span>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEAL, margin: "0 0 10px" }}>2. Pick your track</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              <div style={{ background: "#e8f8f4", border: "1px solid #a7f3d0", borderRadius: 12, padding: 12 }}>
                <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: TEAL }}>Learn track</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#0f766e" }}>Study from scratch, chapter by chapter</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  <li>Expert tutor explains every subtopic</li>
                  <li>Video reinforcement</li>
                  <li>Exam style questions</li>
                </ul>
              </div>
              <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: 12 }}>
                <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#6d28d9" }}>Past paper prep</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6b21a8" }}>Practice with real past papers</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  <li>Papers from 2019 to 2025</li>
                  <li>Smart predict - likely exam topics</li>
                  <li>Expert mark scheme review</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEAL, margin: "0 0 6px" }}>3. Study a subtopic</p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 10px" }}>
              Each subtopic has a structured flow. Work through the tabs in order:
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              Explain → Formulas → Example → Test → Exam Style
            </p>
            <div style={{ borderLeft: `4px solid ${TEAL}`, background: "#f0fdf9", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                The Explain tab shows key points and exam tips written specifically for Cambridge 0620. Scroll down and ask your
                expert tutor anything - it knows your exact subtopic.
              </p>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEAL, margin: "0 0 6px" }}>4. Use your expert tutor</p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 10px" }}>
              Your expert tutor is available on every subtopic page. You can ask it:
            </p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
              <li>&quot;Explain this in simpler words&quot;</li>
              <li>&quot;Give me a trick to remember this&quot;</li>
              <li>&quot;What is the Cambridge mark scheme answer?&quot;</li>
              <li>&quot;I got this wrong - what did I miss?&quot;</li>
            </ul>
            <div style={{ borderLeft: `4px solid ${TEAL}`, background: "#f0fdf9", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                You can also speak your question using the microphone button - useful on mobile.
              </p>
            </div>
          </div>
        </section>

        <section style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 18, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" }}>
            Tips for best results
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Do the Explain tab first</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Read the key points before watching the video.</p>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Check the estimated time</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Each subtopic shows how long it takes to complete.</p>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Attempt every question</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Try first, then check the expert explanation.</p>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Ask in your own words</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Your tutor understands plain English and Urdu.</p>
            </div>
          </div>
        </section>

        <section style={{ background: TEAL, color: "white", borderRadius: 16, padding: "18px 18px 16px" }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Ready to start?</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
            Chemistry is fully loaded - 12 chapters, 43 videos, papers from 2019 to 2025
          </p>
          <button
            type="button"
            onClick={handleStartChemistry}
            style={{
              background: "white",
              color: TEAL,
              border: "none",
              borderRadius: 10,
              padding: "11px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Start Chemistry →
          </button>
        </section>
      </div>
    </main>
  );
}
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GRADE_OPTIONS = [
  {
    grade: "C",
    label: "Pass",
    sublabel: "Grade C — I just need to pass",
    emoji: "✓",
    color: "#6B7280",
    bg: "#F3F4F6",
    border: "#D1D5DB",
  },
  {
    grade: "B",
    label: "Good",
    sublabel: "Grade B — above average",
    emoji: "👍",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    grade: "A",
    label: "Excellent",
    sublabel: "Grade A — strong performance",
    emoji: "⭐",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    grade: "A*",
    label: "Top",
    sublabel: "Grade A* — highest possible",
    emoji: "🏆",
    color: "#189080",
    bg: "#E8F8F4",
    border: "#6EE7B7",
  },
];

const STUDY_DAYS = [3, 4, 5, 6, 7];
const STUDY_MINUTES = [30, 45, 60, 90];

function getExamDate(session: string, year: number): Date {
  const month = session === "May/June" ? 4 : 9;
  return new Date(year, month, 15);
}

function getDaysUntilExam(session: string, year: number): number {
  const examDate = getExamDate(session, year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStudyMode(daysUntilExam: number): "crash" | "rapid" | "full" {
  if (daysUntilExam <= 28) return "crash";
  if (daysUntilExam <= 60) return "rapid";
  return "full";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [studentName, setStudentName] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    examSession: "May/June",
    examYear: new Date().getFullYear() + 1,
    targetGrade: "",
    studyDaysPerWeek: 5,
    studyMinutesPerDay: 45,
  });

  const [welcomeMessage, setWelcomeMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: student } = await supabase
          .from("students")
          .select("onboarding_complete, name, onboarding_subject")
          .eq("id", session.user.id)
          .maybeSingle();

        if (student?.onboarding_complete) {
          router.push("/dashboard");
          return;
        }

        const skip =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("skip") === "true";

        const name =
          session.user.user_metadata?.child_name ??
          session.user.user_metadata?.name ??
          student?.name ??
          "Student";
        setStudentName(name);

        const subjectFromDb =
          student?.onboarding_subject != null && String(student.onboarding_subject).trim() !== ""
            ? String(student.onboarding_subject)
            : "";

        if (subjectFromDb) {
          setForm((f) => ({ ...f, subject: subjectFromDb }));
        } else if (skip) {
          setForm((f) => ({ ...f, subject: "Chemistry" }));
        } else {
          router.push("/subjects");
          return;
        }

        setAuthReady(true);
        return;
      }

      router.push("/login");
    };

    void init();
  }, [router]);

  if (!authReady) {
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
          <p style={{ color: "#6b7280", fontSize: 14 }}>Setting up your account...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const generateWelcomeMessage = async () => {
    setLoading(true);
    const daysUntilExam = getDaysUntilExam(form.examSession, form.examYear);
    const weeksUntilExam = Math.max(1, Math.ceil(daysUntilExam / 7));
    const studyMode = getStudyMode(daysUntilExam);
    const urgency =
      daysUntilExam <= 14
        ? "very high"
        : daysUntilExam <= 28
          ? "high"
          : daysUntilExam <= 60
            ? "medium"
            : "steady";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          subject: form.subject,
          topic: "Welcome",
          message: `Write a warm 3-sentence welcome message for ${studentName} who is targeting Grade ${form.targetGrade} in ${form.subject} for ${form.examSession} ${form.examYear}. They have ${daysUntilExam} days (${weeksUntilExam} weeks) until the exam, urgency is ${urgency}, and recommended study mode is ${studyMode}. They will study ${form.studyDaysPerWeek} days a week for ${form.studyMinutesPerDay} minutes. Mention one practical next step and keep it encouraging.`,
          history: [],
          mode: "chat",
        }),
      });

      clearTimeout(timeout);
      const data = await res.json();
      setWelcomeMessage(
        data.message ??
          `Welcome to MyGradePal, ${studentName}! You're targeting Grade ${form.targetGrade} in ${form.subject}. Let's build your plan and get you there!`,
      );
    } catch {
      setWelcomeMessage(
        `Welcome to MyGradePal, ${studentName}! You're targeting Grade ${form.targetGrade} in ${form.subject} for ${form.examSession} ${form.examYear}. Study ${form.studyDaysPerWeek} days a week and we'll get you there!`,
      );
    }

    setLoading(false);
    setStep(4);
  };

  const saveAndFinish = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("students")
      .upsert(
        {
        id: user.id,
        email: user.email ?? "",
        name: studentName,
        target_grade: form.targetGrade,
        exam_session: form.examSession,
        exam_year: form.examYear,
        study_days_per_week: form.studyDaysPerWeek,
        study_minutes_per_day: form.studyMinutesPerDay,
        onboarding_complete: true,
        onboarding_subject: form.subject,
        welcome_message: welcomeMessage || "",
        subscription_subjects: [form.subject],
        },
        { onConflict: "id" },
      );

    if (error) {
      console.error("Save error:", error);
      setLoading(false);
      return;
    }

    router.push("/generating-plan");
  };

  const teal = "#189080";
  const orange = "#f5731e";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700 }}>
            <span style={{ color: teal }}>My</span>
            <span style={{ color: "#1a1a1a" }}>Grade</span>
            <span style={{ color: orange }}>Pal</span>
          </span>
        </div>

        <div
          style={{
            background: "#e5e7eb",
            borderRadius: 20,
            height: 4,
            marginBottom: 32,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: teal,
              height: "100%",
              borderRadius: 20,
              width: `${(step / 4) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: "32px 28px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {step === 1 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: teal,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Step 1 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 8,
                }}
              >
                When is your {form.subject} exam?
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                This helps us calculate how much time you have and what to prioritise.
              </p>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Exam session</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {["May/June", "Oct/Nov"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, examSession: s }))}
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      border: `1.5px solid ${form.examSession === s ? teal : "#e5e7eb"}`,
                      background: form.examSession === s ? "#E8F8F4" : "white",
                      color: form.examSession === s ? teal : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Exam year</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[2025, 2026, 2027].map((y) => (
                  <button
                    key={y}
                    onClick={() => setForm((f) => ({ ...f, examYear: y }))}
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      border: `1.5px solid ${form.examYear === y ? teal : "#e5e7eb"}`,
                      background: form.examYear === y ? "#E8F8F4" : "white",
                      color: form.examYear === y ? teal : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => router.push("/subjects")}
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: 10,
                    background: "white",
                    border: "1.5px solid #e5e7eb",
                    color: "#374151",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={next}
                  style={{
                    flex: 2,
                    padding: "13px",
                    borderRadius: 10,
                    background: teal,
                    border: "none",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: teal,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Step 2 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 8,
                }}
              >
                What grade are you aiming for?
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                We'll build your study plan around your target. You can always change this later.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g.grade}
                    onClick={() => setForm((f) => ({ ...f, targetGrade: g.grade }))}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: `1.5px solid ${form.targetGrade === g.grade ? g.color : "#e5e7eb"}`,
                      background: form.targetGrade === g.grade ? g.bg : "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{g.emoji}</span>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: g.color, margin: 0 }}>
                        Grade {g.grade} — {g.label}
                      </p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{g.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button
                  onClick={back}
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: 10,
                    background: "white",
                    border: "1.5px solid #e5e7eb",
                    color: "#374151",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!form.targetGrade}
                  style={{
                    flex: 2,
                    padding: "13px",
                    borderRadius: 10,
                    background: form.targetGrade ? teal : "#d1d5db",
                    border: "none",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: form.targetGrade ? "pointer" : "default",
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: teal,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Step 3 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 8,
                }}
              >
                How much can you study?
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                Be honest — a realistic plan you follow beats a perfect plan you don't.
              </p>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Days per week</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {STUDY_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm((f) => ({ ...f, studyDaysPerWeek: d }))}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      border: `1.5px solid ${form.studyDaysPerWeek === d ? teal : "#e5e7eb"}`,
                      background: form.studyDaysPerWeek === d ? "#E8F8F4" : "white",
                      color: form.studyDaysPerWeek === d ? teal : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Minutes per session</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {STUDY_MINUTES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, studyMinutesPerDay: m }))}
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      border: `1.5px solid ${form.studyMinutesPerDay === m ? teal : "#e5e7eb"}`,
                      background: form.studyMinutesPerDay === m ? "#E8F8F4" : "white",
                      color: form.studyMinutesPerDay === m ? teal : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button
                  onClick={back}
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: 10,
                    background: "white",
                    border: "1.5px solid #e5e7eb",
                    color: "#374151",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => void generateWelcomeMessage()}
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: "13px",
                    borderRadius: 10,
                    background: teal,
                    border: "none",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: loading ? "default" : "pointer",
                  }}
                >
                  {loading ? "Building your plan..." : "Build my plan →"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: teal,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Step 4 of 4
              </p>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
                <h2
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: 4,
                  }}
                >
                  Your plan is ready!
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280" }}>
                  {form.subject} · {form.examSession} {form.examYear} · Grade {form.targetGrade} target
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, justifyContent: "center" }}>
                {[
                  `📚 ${form.subject}`,
                  `🎯 Grade ${form.targetGrade}`,
                  `📅 ${form.examSession} ${form.examYear}`,
                  `⏱ ${form.studyDaysPerWeek} days/week`,
                  `⏱ ${form.studyMinutesPerDay} min/day`,
                ].map((chip, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#E8F8F4",
                      color: teal,
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "4px 12px",
                      borderRadius: 20,
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 12,
                  padding: "16px",
                  border: "1px solid #e5e7eb",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: teal, margin: 0 }}>YOUR PERSONAL TUTOR</p>
                </div>
                {loading ? (
                  <p style={{ fontSize: 14, color: "#6b7280" }}>Building your personalised message...</p>
                ) : (
                  <p
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      lineHeight: 1.7,
                      margin: 0,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {welcomeMessage}
                  </p>
                )}
              </div>

              <button
                onClick={() => void saveAndFinish()}
                disabled={loading && !welcomeMessage}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  background: "#189080",
                  border: "none",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: loading && !welcomeMessage ? 0.7 : 1,
                }}
              >
                {loading && !welcomeMessage ? "Building your plan..." : "Start Learning →"}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? 20 : 8,
                height: 8,
                borderRadius: 20,
                background: s <= step ? teal : "#d1d5db",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
