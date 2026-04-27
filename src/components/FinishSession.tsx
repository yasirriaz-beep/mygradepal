"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TEAL   = "#189080";
const ORANGE = "#f5731e";

interface NextSession {
  topic: string;
  subtopic: string;
  scheduled_date: string;
}

export default function FinishSession() {
  const router      = useRouter();
  const params      = useSearchParams();
  const subject     = params.get("subject") ?? "Chemistry";
  const topic       = params.get("topic")   ?? "";

  const [studentId,    setStudentId]    = useState<string | null>(null);
  const [show,         setShow]         = useState(false);
  const [completing,   setCompleting]   = useState(false);
  const [completed,    setCompleted]    = useState(false);
  const [nextSession,  setNextSession]  = useState<NextSession | null>(null);
  const [questionsCount, setQuestionsCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setStudentId(data.user.id);
    });
  }, []);

  // Show button after 60 seconds on page
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 60000);
    return () => clearTimeout(timer);
  }, []);

  // Count attempts for this topic in this session
  useEffect(() => {
    if (!studentId || !topic) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .gte("attempted_at", today + "T00:00:00")
      .then(({ count }) => {
        if (count && count > 0) {
          setQuestionsCount(count);
          setShow(true); // show button early if they've answered questions
        }
      });
  }, [studentId, topic]);

  const handleComplete = async () => {
    if (!studentId || completing) return;
    setCompleting(true);

    const today = new Date().toISOString().split("T")[0];

    // Mark today's study_plan session as complete
    await supabase
      .from("study_plan")
      .update({ completed: true })
      .eq("student_id", studentId)
      .eq("scheduled_date", today)
      .eq("topic", topic);

    // Insert study_sessions record
    await supabase.from("study_sessions").insert({
      student_id:         studentId,
      date:               today,
      started_at:         new Date(Date.now() - 45 * 60000).toISOString(),
      ended_at:           new Date().toISOString(),
      duration_minutes:   45,
      questions_attempted: questionsCount,
      topics_covered:     [topic],
      session_complete:   true,
    });

    // Fetch next incomplete session
    const { data: nextData } = await supabase
      .from("study_plan")
      .select("topic, subtopic, scheduled_date")
      .eq("student_id", studentId)
      .eq("completed", false)
      .gt("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .single();

    if (nextData) setNextSession(nextData as NextSession);
    setCompleting(false);
    setCompleted(true);
  };

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long"
    });
  }

  // ── Completion screen ─────────────────────────────────────────────────────
  if (completed) return (
    <div style={{
      position: "fixed", inset: 0, background: "#f0faf8",
      zIndex: 100, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 24,
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>

        {/* Success icon */}
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#e8f8f4", border: `3px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px" }}>
          ✓
        </div>

        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
          Session Complete! 🎉
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 24px" }}>
          Great work on <strong>{topic}</strong>
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Topic Covered",    value: subject,            color: TEAL   },
            { label: "Questions Done",   value: String(questionsCount || "—"), color: ORANGE },
          ].map(s => (
            <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "14px 10px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Next session preview */}
        {nextSession && (
          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: `1.5px solid ${TEAL}`, textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
              Next Session
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>{nextSession.topic}</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>{nextSession.subtopic}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>📅 {fmtDate(nextSession.scheduled_date)}</p>
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: TEAL, color: "white", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
          >
            Back to Dashboard →
          </button>
          {nextSession && (
            <button
              onClick={() => router.push(`/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(nextSession.topic)}`)}
              style={{ width: "100%", padding: "13px", borderRadius: 12, background: "white", color: TEAL, fontSize: 14, fontWeight: 600, border: `1.5px solid ${TEAL}`, cursor: "pointer" }}
            >
              Start next session now →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Floating finish button ────────────────────────────────────────────────
  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    }}>
      <button
        onClick={() => void handleComplete()}
        disabled={completing}
        style={{
          background: completing ? "#e5e7eb" : TEAL,
          color: completing ? "#9ca3af" : "white",
          border: "none",
          borderRadius: 30,
          padding: "13px 28px",
          fontSize: 14,
          fontWeight: 700,
          cursor: completing ? "default" : "pointer",
          boxShadow: "0 4px 20px rgba(24,144,128,0.4)",
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {completing ? "Saving..." : "✓ Finish Session"}
      </button>
      <p style={{ fontSize: 11, color: "#6b7280", margin: 0, background: "white", borderRadius: 20, padding: "3px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        Marks this topic as complete
      </p>
    </div>
  );
}
