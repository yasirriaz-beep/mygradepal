"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SUBJECTS = ["Chemistry", "Physics", "Mathematics", "Biology", "English"];

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
          .select("onboarding_complete, name")
          .eq("id", session.user.id)
          .single();

        if (student?.onboarding_complete) {
          router.push("/dashboard");
          return;
        }

        const name =
          session.user.user_metadata?.child_name ??
          session.user.user_metadata?.name ??
          student?.name ??
          "Student";
        setStudentName(name);
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
    setStep(5);
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

    const planResponse = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: user.id,
        subject: form.subject,
        examSession: form.examSession,
        examYear: form.examYear,
        targetGrade: form.targetGrade,
        studyDaysPerWeek: form.studyDaysPerWeek,
        studyMinutesPerDay: form.studyMinutesPerDay,
      }),
    });

    let planResult: unknown;
    try {
      planResult = await planResponse.json();
    } catch {
      planResult = { parseError: "Response was not JSON", status: planResponse.status };
    }
    console.log("Plan generation result:", planResult);

    if (!planResponse.ok) {
      console.error("Plan generation failed:", planResult);
    }

    router.push("/dashboard");
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
              width: `${(step / 5) * 100}%`,
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
                Assalam o Alaikum, {studentName}! 👋
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                Let's set up your personal study plan. Which subject do you want to start with?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, subject: s }))}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      border: `1.5px solid ${form.subject === s ? teal : "#e5e7eb"}`,
                      background: form.subject === s ? "#E8F8F4" : "white",
                      color: form.subject === s ? teal : "#374151",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={next}
                disabled={!form.subject}
                style={{
                  marginTop: 24,
                  width: "100%",
                  padding: "13px",
                  borderRadius: 10,
                  background: form.subject ? teal : "#d1d5db",
                  color: "white",
                  border: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: form.subject ? "pointer" : "default",
                }}
              >
                Continue →
              </button>
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
                }}
              >
                Step 4 of 4
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

          {step === 5 && (
            <div>
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
          {[1, 2, 3, 4, 5].map((s) => (
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
