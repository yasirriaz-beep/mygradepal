"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const TEAL = "#189080";
const ORANGE = "#f5731e";

interface PendingQuestion {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  paper_type: string;
  question_text: string;
  options_json: string | null;
  correct_answer: string;
  mark_scheme: string;
  feedback: string;
  common_mistake: string;
  exam_tip: string;
  syllabus_ref: string;
  command_word: string;
  subject: string;
  reviewed: boolean;
  review_notes: string | null;
}

export default function ReviewQuestionsPage() {
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [topicFilter, setTopicFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [totalPending, setTotalPending] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState("");

  const loadQuestions = async () => {
    setLoading(true);
    let query = supabase
      .from("pending_questions")
      .select("*")
      .eq("reviewed", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (filter !== "All") query = query.eq("paper_type", filter);
    if (topicFilter !== "All") query = query.eq("topic", topicFilter);

    const { data } = await query;
    setQuestions((data ?? []) as PendingQuestion[]);

    // Get counts
    const { count: pending } = await supabase
      .from("pending_questions")
      .select("id", { count: "exact" })
      .eq("reviewed", false);

    const { count: approved } = await supabase
      .from("questions")
      .select("id", { count: "exact" })
      .eq("source", "MGP_Generated");

    setTotalPending(pending ?? 0);
    setApprovedCount(approved ?? 0);
    setLoading(false);
  };

  useEffect(() => { void loadQuestions(); }, [filter, topicFilter]);

  const approveOne = async (q: PendingQuestion) => {
    setSaving(q.id);

    const res = await fetch("/api/admin/approve-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    const data = await res.json() as { success?: boolean; error?: string };

    if (!res.ok || data.error) {
      alert(`Failed to approve: ${data.error ?? "Unknown error"}`);
      setSaving(null);
      return;
    }

    setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    setTotalPending((prev) => Math.max(0, prev - 1));
    setApprovedCount((prev) => prev + 1);
    setSuccessMsg("✓ Question approved and live");
    setTimeout(() => setSuccessMsg(""), 2000);
    setSaving(null);
  };

  const rejectOne = async (id: string) => {
    if (!confirm("Reject this question?")) return;

    const res = await fetch("/api/admin/approve-question", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setQuestions((prev) => prev.filter((x) => x.id !== id));
      setTotalPending((prev) => Math.max(0, prev - 1));
    }
  };

  const approveSelected = async () => {
    setSaving("bulk");
    const toApprove = questions.filter((q) => selected.has(q.id));

    for (const q of toApprove) {
      await approveOne(q);
    }

    setSelected(new Set());
    setBulkMode(false);
    setSuccessMsg(`✓ ${toApprove.length} questions approved and moved to database`);
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(null);
  };

  const approveAll = async () => {
    if (!confirm(`Approve all ${questions.length} visible questions? They will be moved to the live database.`)) return;
    setSaving("all");

    for (const q of questions) {
      await approveOne(q);
    }

    setSuccessMsg(`✓ All ${questions.length} questions approved`);
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const topics = ["All", ...Array.from(new Set(questions.map((q) => q.topic)))];

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>
            ✅ Review Questions
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
            {totalPending} pending · {approvedCount} approved and live
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/question-bank?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>
            📚 Bank
          </Link>
          <Link href="/admin?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>
            ← Admin
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Pending Review", value: totalPending, color: ORANGE, bg: "#fff7ed" },
            { label: "Approved & Live", value: approvedCount, color: TEAL, bg: "#e8f8f4" },
            { label: "Showing Now", value: questions.length, color: "#374151", bg: "#f8fafc" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Success message */}
        {successMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 600, margin: 0 }}>{successMsg}</p>
          </div>
        )}

        {/* Filters + actions */}
        <div style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 14, border: "1px solid #e5e7eb", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
            {["All", "MCQ", "Theory", "Practical"].map((f) => <option key={f}>{f}</option>)}
          </select>
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
            {topics.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setBulkMode((p) => !p)}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${bulkMode ? TEAL : "#e5e7eb"}`, background: bulkMode ? "#e8f8f4" : "white", color: bulkMode ? TEAL : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {bulkMode ? `${selected.size} selected` : "Bulk select"}
          </button>
          {bulkMode && selected.size > 0 && (
            <button
              onClick={() => void approveSelected()}
              disabled={saving === "bulk"}
              style={{ padding: "7px 14px", borderRadius: 8, background: TEAL, color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {saving === "bulk" ? "Approving..." : `Approve ${selected.size} →`}
            </button>
          )}
          <button
            onClick={() => void approveAll()}
            disabled={saving === "all" || questions.length === 0}
            style={{ padding: "7px 14px", borderRadius: 8, background: "#16a34a", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {saving === "all" ? "Processing..." : `Approve All ${questions.length}`}
          </button>
        </div>

        {/* Question list */}
        {loading ? (
          <div style={{ background: "white", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: `3px solid ${TEAL}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : questions.length === 0 ? (
          <div style={{ background: "white", borderRadius: 14, padding: 40, textAlign: "center", border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 36, margin: "0 0 12px" }}>🎉</p>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
              Nothing to review!
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              All pending questions have been reviewed.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {questions.map((q, idx) => {
              const options = q.options_json ? JSON.parse(q.options_json) as Record<string, string> : null;
              const isExpanded = expanded === q.id;
              const isSelected = selected.has(q.id);

              return (
                <div
                  key={q.id}
                  style={{ background: isSelected ? "#f0fdf9" : "white", border: `1.5px solid ${isSelected ? TEAL : "#e5e7eb"}`, borderRadius: 14, overflow: "hidden" }}
                >
                  {/* Header row */}
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(q.id)}
                        style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                      />
                    )}
                    <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>{idx + 1}.</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: q.paper_type === "MCQ" ? TEAL : q.paper_type === "Theory" ? "#7c3aed" : ORANGE, background: q.paper_type === "MCQ" ? "#e8f8f4" : q.paper_type === "Theory" ? "#f5f3ff" : "#fff7ed", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                      {q.paper_type}
                    </span>
                    <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 7px", flexShrink: 0, textTransform: "capitalize" }}>
                      {q.difficulty}
                    </span>
                    <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                      {q.topic}
                    </span>
                    <p
                      style={{ fontSize: 12, color: "#374151", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {q.question_text.slice(0, 90)}...
                    </p>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setExpanded(isExpanded ? null : q.id);
                        }}
                        style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #e5e7eb", background: "white", fontSize: 11, color: "#6b7280", cursor: "pointer" }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          console.log("Reject clicked for:", q.id);
                          await rejectOne(q.id);
                          console.log("rejectOne finished");
                        }}
                        style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 11, color: "#dc2626", fontWeight: 600, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          console.log("Approve clicked for:", q.id, q.subject, q.topic);
                          await approveOne(q);
                          console.log("approveOne finished");
                        }}
                        disabled={saving === q.id}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 7,
                          border: "none",
                          background: saving === q.id ? "#e5e7eb" : "#189080",
                          color: saving === q.id ? "#9ca3af" : "white",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: saving === q.id ? "default" : "pointer",
                          whiteSpace: "nowrap",
                          minWidth: 90
                        }}
                      >
                        {saving === q.id ? "Saving..." : "✓ Approve"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: "0 14px 16px", borderTop: "1px solid #f1f5f9" }}>
                      {/* Full question */}
                      <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px", margin: "12px 0 10px", border: "1px solid #e5e7eb" }}>
                        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                          {q.question_text}
                        </p>
                      </div>

                      {/* MCQ Options */}
                      {options && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                          {(["A", "B", "C", "D"] as const).map((opt) => (
                            <div key={opt} style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${q.correct_answer === opt ? TEAL : "#e5e7eb"}`, background: q.correct_answer === opt ? "#e8f8f4" : "white", display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: q.correct_answer === opt ? TEAL : "#9ca3af", width: 14 }}>{opt}</span>
                              <span style={{ fontSize: 12, color: "#374151" }}>{options[opt]}</span>
                              {q.correct_answer === opt && <span style={{ fontSize: 10, color: TEAL, marginLeft: "auto" }}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mark scheme */}
                      <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #ddd6fe" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", margin: "0 0 3px" }}>📋 Mark Scheme</p>
                        <p style={{ fontSize: 12, color: "#374151", margin: 0, whiteSpace: "pre-line" }}>{q.mark_scheme}</p>
                      </div>

                      {/* Explanation + common mistake + exam tip */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div style={{ background: "#e8f8f4", borderRadius: 8, padding: "8px 10px", border: "1px solid #a7f3d0" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: TEAL, margin: "0 0 3px" }}>💡 Explanation</p>
                          <p style={{ fontSize: 11, color: "#374151", margin: 0, lineHeight: 1.5 }}>{q.feedback}</p>
                        </div>
                        <div style={{ background: "#fef2f2", borderRadius: 8, padding: "8px 10px", border: "1px solid #fecaca" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", margin: "0 0 3px" }}>⚠️ Common Mistake</p>
                          <p style={{ fontSize: 11, color: "#374151", margin: 0, lineHeight: 1.5 }}>{q.common_mistake}</p>
                        </div>
                        <div style={{ background: "#fff7ed", borderRadius: 8, padding: "8px 10px", border: "1px solid #fed7aa" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: ORANGE, margin: "0 0 3px" }}>🎯 Exam Tip</p>
                          <p style={{ fontSize: 11, color: "#374151", margin: 0, lineHeight: 1.5 }}>{q.exam_tip}</p>
                        </div>
                      </div>

                      {/* Meta */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {q.syllabus_ref && <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>Syllabus {q.syllabus_ref}</span>}
                        {q.subtopic && <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>{q.subtopic}</span>}
                        {q.command_word && <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>{q.command_word}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {questions.length >= 50 && (
          <button
            onClick={() => void loadQuestions()}
            style={{ width: "100%", marginTop: 12, padding: "12px", borderRadius: 10, background: "white", border: "1.5px solid #e5e7eb", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Load more questions →
          </button>
        )}
      </div>
    </div>
  );
}
