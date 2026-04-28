"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const TEAL   = "#189080";
const ORANGE = "#f5731e";

const SYLLABUS = [
  { topic: "States of Matter",                   target: 40  },
  { topic: "Atoms, Elements and Compounds",       target: 100 },
  { topic: "Stoichiometry",                       target: 150 },
  { topic: "Electrochemistry",                    target: 100 },
  { topic: "Chemical Energetics",                 target: 80  },
  { topic: "Chemical Reactions",                  target: 150 },
  { topic: "Acids, Bases and Salts",              target: 150 },
  { topic: "The Periodic Table",                  target: 100 },
  { topic: "Metals",                              target: 100 },
  { topic: "Chemistry of the Environment",        target: 60  },
  { topic: "Organic Chemistry",                   target: 150 },
  { topic: "Experimental Techniques & Analysis",  target: 120 },
];

interface Question {
  id:            string;
  topic:         string;
  subtopic:      string;
  difficulty:    string;
  paper_type:    string;
  question_text: string;
  mark_scheme:   string;
  source:        string;
  common_mistake: string;
  exam_tip:      string;
  syllabus_ref:  string;
  correct_answer: string;
  has_diagram?:  boolean;
  diagram_url?:  string | null;
}

export default function QuestionBankPage() {
  const [subject,       setSubject]       = useState("Chemistry");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [counts,        setCounts]        = useState<Record<string, number>>({});
  const [loading,       setLoading]       = useState(false);
  const [expanded,      setExpanded]      = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [typeFilter,    setTypeFilter]    = useState("All");
  const [deleting,      setDeleting]      = useState<string | null>(null);

  // Load counts for all topics
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("questions")
        .select("topic")
        .eq("subject", subject)
        .limit(2000);

      const c: Record<string, number> = {};
      (data ?? []).forEach((r: { topic: string }) => {
        if (r.topic) c[r.topic] = (c[r.topic] ?? 0) + 1;
      });
      setCounts(c);
    };
    void load();
  }, [subject]);

  // Load questions for selected topic
  useEffect(() => {
    if (!selectedTopic) return;
    const load = async () => {
      setLoading(true);
      setQuestions([]);

      const { data, error } = await supabase
        .from("questions")
        .select("id, topic, subtopic, difficulty, paper_type, question_text, mark_scheme, source, common_mistake, exam_tip, syllabus_ref, correct_answer, has_diagram, diagram_url")
        .eq("subject", subject)
        .eq("topic", selectedTopic)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) console.error("Query error:", error.message);
      setQuestions((data ?? []) as Question[]);
      setLoading(false);
    };
    void load();
  }, [subject, selectedTopic]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    setDeleting(id);
    await supabase.from("questions").delete().eq("id", id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (selectedTopic) {
      setCounts(prev => ({ ...prev, [selectedTopic]: (prev[selectedTopic] ?? 1) - 1 }));
    }
    setDeleting(null);
  };

  const totalCount  = Object.values(counts).reduce((a, b) => a + b, 0);
  const totalTarget = SYLLABUS.reduce((a, s) => a + s.target, 0);
  const totalPct    = Math.round((totalCount / totalTarget) * 100);

  const filtered = questions.filter(q => {
    const matchSearch = !search || q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "All" || q.paper_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>
            📚 Question Bank
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
            {totalCount} questions · {totalPct}% of {totalTarget} target
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/generate-questions?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>⚡ Generate</Link>
          <Link href="/admin?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>← Admin</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>

        {/* Left sidebar */}
        <div>
          <div style={{ background: "white", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid #e5e7eb" }}>
            <select value={subject} onChange={e => { setSubject(e.target.value); setSelectedTopic(null); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontWeight: 600 }}>
              <option>Chemistry</option>
              <option>Physics</option>
              <option>Mathematics</option>
              <option>Biology</option>
            </select>
          </div>

          {/* Overall progress */}
          <div style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 12, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>Overall Progress</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEAL, margin: 0 }}>{totalCount}/{totalTarget}</p>
            </div>
            <div style={{ height: 8, background: "#f3f4f6", borderRadius: 8 }}>
              <div style={{ height: 8, borderRadius: 8, background: TEAL, width: `${Math.min(totalPct, 100)}%` }} />
            </div>
          </div>

          {/* Topic list */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cambridge Syllabus Order
              </p>
            </div>
            {SYLLABUS.map((s, idx) => {
              const count      = counts[s.topic] ?? 0;
              const pct        = Math.round((count / s.target) * 100);
              const isSelected = selectedTopic === s.topic;
              return (
                <button
                  key={s.topic}
                  onClick={() => setSelectedTopic(s.topic)}
                  style={{ width: "100%", padding: "10px 14px", background: isSelected ? "#e8f8f4" : "white", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <p style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? TEAL : "#374151", margin: 0 }}>
                      {idx + 1}. {s.topic}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 80 ? "#16a34a" : pct >= 40 ? TEAL : "#dc2626", background: pct >= 80 ? "#f0fdf4" : pct >= 40 ? "#e8f8f4" : "#fef2f2", borderRadius: 20, padding: "1px 6px" }}>
                      {count}/{s.target}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "#f3f4f6", borderRadius: 3 }}>
                    <div style={{ height: 3, borderRadius: 3, background: pct >= 80 ? "#16a34a" : pct >= 40 ? TEAL : ORANGE, width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right content */}
        <div>
          {!selectedTopic ? (
            <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 32, margin: "0 0 12px" }}>📚</p>
              <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Select a topic</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Click any topic from the Cambridge syllabus list</p>
            </div>
          ) : (
            <div>
              {/* Filters */}
              <div style={{ background: "white", borderRadius: 12, padding: "10px 14px", marginBottom: 12, border: "1px solid #e5e7eb", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0 }}>{selectedTopic}</p>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ flex: 1, minWidth: 150, padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}>
                  {["All", "MCQ", "Theory", "Practical"].map(t => <option key={t}>{t}</option>)}
                </select>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} questions</span>
                <Link href={`/admin/generate-questions?key=mgp2025`} style={{ fontSize: 12, fontWeight: 600, color: TEAL, textDecoration: "none", background: "#e8f8f4", borderRadius: 8, padding: "5px 12px" }}>
                  + Generate more
                </Link>
              </div>

              {loading ? (
                <div style={{ background: "white", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #e5e7eb" }}>
                  <div style={{ width: 28, height: 28, border: `3px solid #e5e7eb`, borderTop: `3px solid ${TEAL}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: 32, margin: "0 0 10px" }}>📭</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No questions yet</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>Generate questions for {selectedTopic}</p>
                  <Link href="/admin/generate-questions?key=mgp2025" style={{ display: "inline-block", background: TEAL, color: "white", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    ⚡ Generate Questions →
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.map((q, idx) => (
                    <div key={q.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                        <span style={{ fontSize: 11, color: "#9ca3af", width: 24, flexShrink: 0 }}>{idx + 1}.</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: q.paper_type === "MCQ" ? TEAL : q.paper_type === "Theory" ? "#7c3aed" : ORANGE, background: q.paper_type === "MCQ" ? "#e8f8f4" : q.paper_type === "Theory" ? "#f5f3ff" : "#fff7ed", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                          {q.paper_type ?? "MCQ"}
                        </span>
                        <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 7px", flexShrink: 0, textTransform: "capitalize" }}>
                          {q.difficulty}
                        </span>
                        {q.source === "MGP_Generated" && (
                          <span style={{ fontSize: 10, color: ORANGE, background: "#fff7ed", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>⚡ MGP</span>
                        )}
                        {q.source === "Cambridge" && (
                          <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>📄 Cambridge</span>
                        )}
                        <p style={{ fontSize: 12, color: "#374151", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.question_text.slice(0, 100)}
                        </p>
                        <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>{expanded === q.id ? "▲" : "▼"}</span>
                      </div>

                      {expanded === q.id && (
                        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f1f5f9" }}>
                          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "12px 0 10px", background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e5e7eb" }}>
                            {q.question_text}
                          </p>
                          {q.correct_answer && (
                            <div style={{ background: "#e8f8f4", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #a7f3d0" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: "0 0 2px" }}>✓ Answer</p>
                              <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>{q.correct_answer}</p>
                            </div>
                          )}
                          {q.mark_scheme && (
                            <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #ddd6fe" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", margin: "0 0 2px" }}>📋 Mark Scheme</p>
                              <p style={{ fontSize: 12, color: "#374151", margin: 0, whiteSpace: "pre-line" }}>{q.mark_scheme}</p>
                            </div>
                          )}
                          {q.has_diagram && !q.diagram_url && (
                            <button
                              onClick={async () => {
                                const res = await fetch("/api/generate-diagram", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ questionId: q.id, questionText: q.question_text }),
                                });
                                const data = await res.json();
                                if (data.diagramUrl) {
                                  alert("Diagram generated successfully!");
                                  // Refresh the question
                                  window.location.reload();
                                } else {
                                  alert("Failed: " + data.error);
                                }
                              }}
                              style={{ padding: "8px 16px", borderRadius: 8, background: "#4285f4", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 }}
                            >
                              🎨 Generate Diagram with AI
                            </button>
                          )}
                          {(q.common_mistake || q.exam_tip) && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                              {q.common_mistake && (
                                <div style={{ background: "#fef2f2", borderRadius: 8, padding: "8px 10px", border: "1px solid #fecaca" }}>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", margin: "0 0 3px" }}>⚠️ Common Mistake</p>
                                  <p style={{ fontSize: 11, color: "#374151", margin: 0 }}>{q.common_mistake}</p>
                                </div>
                              )}
                              {q.exam_tip && (
                                <div style={{ background: "#fff7ed", borderRadius: 8, padding: "8px 10px", border: "1px solid #fed7aa" }}>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: ORANGE, margin: "0 0 3px" }}>🎯 Exam Tip</p>
                                  <p style={{ fontSize: 11, color: "#374151", margin: 0 }}>{q.exam_tip}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {q.syllabus_ref && <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>Syllabus {q.syllabus_ref}</span>}
                              {q.subtopic && <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>{q.subtopic}</span>}
                            </div>
                            <button
                              onClick={() => void handleDelete(q.id)}
                              disabled={deleting === q.id}
                              style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                            >
                              {deleting === q.id ? "..." : "🗑 Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
