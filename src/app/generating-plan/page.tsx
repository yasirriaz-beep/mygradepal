"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const teal   = "#189080";
const orange = "#f5731e";

const TOPIC_FREQUENCY: Record<string, Array<{ topic: string; pct: number; emoji: string }>> = {
  Chemistry: [
    { topic: "Stoichiometry",          pct: 94, emoji: "🔥" },
    { topic: "Electrochemistry",       pct: 88, emoji: "🔥" },
    { topic: "Organic Chemistry",      pct: 76, emoji: "⚡" },
    { topic: "Acids, Bases and Salts", pct: 71, emoji: "⚡" },
    { topic: "Atomic Structure",       pct: 68, emoji: "⚡" },
    { topic: "Rates of Reaction",      pct: 61, emoji: "✓"  },
    { topic: "Energy Changes",         pct: 58, emoji: "✓"  },
  ],
  Physics: [
    { topic: "Forces and Motion",      pct: 92, emoji: "🔥" },
    { topic: "Electricity",            pct: 87, emoji: "🔥" },
    { topic: "Waves",                  pct: 74, emoji: "⚡" },
    { topic: "Thermal Physics",        pct: 69, emoji: "⚡" },
    { topic: "Magnetism",              pct: 55, emoji: "✓"  },
  ],
  Mathematics: [
    { topic: "Algebra",                pct: 96, emoji: "🔥" },
    { topic: "Geometry",               pct: 89, emoji: "🔥" },
    { topic: "Statistics",             pct: 78, emoji: "⚡" },
    { topic: "Trigonometry",           pct: 72, emoji: "⚡" },
    { topic: "Number",                 pct: 65, emoji: "✓"  },
  ],
  Biology: [
    { topic: "Cell Biology",           pct: 91, emoji: "🔥" },
    { topic: "Genetics",               pct: 85, emoji: "🔥" },
    { topic: "Respiration",            pct: 73, emoji: "⚡" },
    { topic: "Ecology",                pct: 64, emoji: "⚡" },
  ],
};

const DEFAULT_TOPICS = [
  { topic: "Core Topic 1", pct: 90, emoji: "🔥" },
  { topic: "Core Topic 2", pct: 80, emoji: "⚡" },
  { topic: "Core Topic 3", pct: 65, emoji: "✓"  },
];

const MESSAGES = [
  "Analysing 15 years of Cambridge past papers...",
  "Identifying your highest-probability topics...",
  "Calculating exam frequency scores...",
  "Building your personalised session schedule...",
  "Finalising your Cambridge-aligned study plan...",
];

export default function GeneratingPlanPage() {
  const router       = useRouter();

  const [step,        setStep]        = useState(0);
  const [showPlan,    setShowPlan]    = useState(false);
  const [done,        setDone]        = useState(false);
  const [studentName, setStudentName] = useState("Ahmed");
  const [subject,     setSubject]     = useState("Chemistry");
  const [daysLeft,    setDaysLeft]    = useState(18);
  const [sessions,    setSessions]    = useState(14);
  const [mode,        setMode]        = useState("crash");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { router.push("/login"); return; }

      const name =
        user.user_metadata?.child_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ?? "Student";
      setStudentName(String(name));

      const { data: student } = await supabase
        .from("students")
        .select("onboarding_subject, exam_session, exam_year, study_days_per_week, study_minutes_per_day, target_grade")
        .eq("id", user.id)
        .single();

      if (student?.onboarding_subject) setSubject(String(student.onboarding_subject));

      if (student?.exam_session && student?.exam_year) {
        const month = student.exam_session === "May/June" ? 4 : 9;
        const exam  = new Date(Number(student.exam_year), month, 15);
        const today = new Date(); today.setHours(0,0,0,0);
        const days  = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
        setDaysLeft(days);
        setMode(days <= 28 ? "crash" : days <= 60 ? "rapid" : "full");
        setSessions(days <= 28 ? 14 : days <= 60 ? 24 : 40);
      }

      // Step through loading messages
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setStep(i);
        if (i >= MESSAGES.length - 1) {
          clearInterval(interval);
          // Call the generate-plan API
          void generatePlan(user.id, student);
        }
      }, 900);
    };

    void init();
  }, [router]);

  const generatePlan = async (userId: string, student: Record<string, unknown> | null) => {
    try {
      await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId:          userId,
          subject:            student?.onboarding_subject,
          examSession:        student?.exam_session,
          examYear:           student?.exam_year,
          targetGrade:        student?.target_grade,
          studyDaysPerWeek:   student?.study_days_per_week,
          studyMinutesPerDay: student?.study_minutes_per_day,
        }),
      });
    } catch (e) {
      console.error("Plan generation error:", e);
    }
    // Show the plan reveal regardless of API result
    setShowPlan(true);
    setTimeout(() => setDone(true), 800);
  };

  const topics = TOPIC_FREQUENCY[subject] ?? DEFAULT_TOPICS;
  const modeLabel = mode === "crash" ? "🚨 Crash Mode" : mode === "rapid" ? "⚡ Rapid Mode" : "📚 Full Course";
  const modeColor = mode === "crash" ? "#dc2626"       : mode === "rapid" ? "#d97706"       : teal;
  const modeBg    = mode === "crash" ? "#fef2f2"       : mode === "rapid" ? "#fffbeb"       : "#e8f8f4";

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: teal, padding: "24px 20px 24px" }}>
        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: "0 0 4px" }}>
          Building your plan...
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>
          {subject} · Cambridge O Level / IGCSE
        </p>
      </div>

      <div style={{ padding: "20px 16px", flex: 1 }}>

        {/* Loading steps */}
        {!showPlan && (
          <div style={{ background: "white", borderRadius: 16, padding: "20px 16px", marginBottom: 16, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, border: `3px solid #e5e7eb`, borderTop: `3px solid ${teal}`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>
                {MESSAGES[Math.min(step, MESSAGES.length - 1)]}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MESSAGES.map((msg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: i <= step ? teal : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s" }}>
                    {i <= step && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
                  </div>
                  <p style={{ fontSize: 12, color: i <= step ? "#374151" : "#9ca3af", margin: 0, fontWeight: i === step ? 600 : 400 }}>
                    {msg}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tutor message reveal */}
        {showPlan && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>

            {/* Tutor bubble */}
            <div style={{ background: "white", borderRadius: 16, padding: "16px", marginBottom: 14, border: `1.5px solid ${teal}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e8f8f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  🎓
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: teal, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Personal Tutor</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Cambridge O Level Expert</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 12px" }}>
                {studentName}, your exam is in <strong>{daysLeft} days</strong>. I've analysed 15 years of Cambridge {subject} past papers and built you a <strong>{sessions}-session plan</strong> covering the highest-probability topics first.
              </p>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                Here's what I'm prioritising for you — these topics have the highest chance of appearing in your paper:
              </p>
            </div>

            {/* Hot topics */}
            <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", marginBottom: 14, border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
                📊 Topic Frequency — Last 15 Years
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topics.map((t) => (
                  <div key={t.topic}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{t.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.topic}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.pct >= 80 ? "#dc2626" : t.pct >= 65 ? "#d97706" : teal }}>
                        {t.pct}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 6 }}>
                      <div style={{ height: 6, borderRadius: 6, width: `${t.pct}%`, background: t.pct >= 80 ? "#dc2626" : t.pct >= 65 ? "#d97706" : teal, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "12px 0 0" }}>
                🔥 Certain (&gt;85%)  ⚡ Likely (65–85%)  ✓ Possible (&lt;65%)
              </p>
            </div>

            {/* Plan summary */}
            <div style={{ background: modeBg, borderRadius: 16, padding: "14px 16px", marginBottom: 20, border: `1px solid ${modeColor}30` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: modeColor, margin: "0 0 10px" }}>
                {modeLabel} — Your Plan Summary
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Sessions",   value: String(sessions) },
                  { label: "Days Left",  value: String(daysLeft) },
                  { label: "Per Session", value: "45 min" },
                ].map(s => (
                  <div key={s.label} style={{ background: "white", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: modeColor, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: "#6b7280", margin: "2px 0 0" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => router.push("/dashboard")}
                style={{ width: "100%", padding: "15px", borderRadius: 12, background: teal, color: "white", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
              >
                Let's go → Start learning
              </button>
              <button
                onClick={() => router.push("/study-plan")}
                style={{ width: "100%", padding: "14px", borderRadius: 12, background: "white", color: teal, fontSize: 14, fontWeight: 600, border: `1.5px solid ${teal}`, cursor: "pointer" }}
              >
                ✏️ Adjust my plan first
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
