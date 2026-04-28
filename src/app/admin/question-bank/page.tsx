"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const TEAL = "#189080";
const ORANGE = "#f5731e";

const SYLLABUS_ORDER = [
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

const TOPIC_TARGETS: Record<string, number> = {
  "States of Matter": 40,
  "Atoms, Elements and Compounds": 100,
  "Stoichiometry": 150,
  "Electrochemistry": 100,
  "Chemical Energetics": 80,
  "Chemical Reactions": 150,
  "Acids, Bases and Salts": 150,
  "The Periodic Table": 100,
  Metals: 100,
  "Chemistry of the Environment": 60,
  "Organic Chemistry": 150,
  "Experimental Techniques & Analysis": 120,
};

interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  paper_type: string;
  question_text: string;
  correct_answer: string;
  mark_scheme: string;
  source: string;
  syllabus_ref: string;
  common_mistake: string;
  exam_tip: string;
  year: number;
  session: string;
  created_at: string;
}

export default function QuestionBankPage() {
  const [subject, setSubject] = useState("Chemistry");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [paperType, setPaperType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [source, setSource] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Load topic counts
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("questions")
        .select("topic")
        .eq("subject", subject);

      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: { topic: string }) => {
        counts[r.topic] = (counts[r.topic] ?? 0) + 1;
      });
      setTopicCounts(counts);
      setTotalCount(data?.length ?? 0);
    };
    void load();
  }, [subject]);

  // Load questions for selected topic
  useEffect(() => {
    if (!selectedTopic) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("questions")
        .select("id, topic, subtopic, difficulty, paper_type, question_text, correct_answer, mark_scheme, source, syllabus_ref, common_mistake, exam_tip, year, session, created_at")
        .eq("subject", subject)
        .eq("topic", selectedTopic)
        .order("difficulty", { ascending: true })
        .order("created_at", { ascending: true });

      if (paperType !== "All") query = query.eq("paper_type", paperType);
      if (difficulty !== "All") query = query.eq("difficulty", difficulty.toLowerCase());

      const { data } = await query.limit(200);
      setQuestions((data ?? []) as Question[]);
      setLoading(false);
    };
    void load();
  }, [subject, selectedTopic, paperType, difficulty, source]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setTopicCounts((prev) => ({
      ...prev,
      [selectedTopic!]: (prev[selectedTopic!] ?? 1) - 1,
    }));
    setTotalCount((prev) => prev - 1);
    setDeleting(null);
  };

  const filtered = questions.filter((q) =>
    !searchText || q.question_text.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalTarget = Object.values(TOPIC_TARGETS).reduce((a, b) => a + b, 0);
  const totalPct = Math.round((totalCount / totalTarget) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>
            📚 Question Bank
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
            {totalCount} questions · {totalPct}% of {totalTarget} target · Cambridge syllabus order
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/generate-questions?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>
            ⚡ Generate
          </Link>
          <Link href="/admin?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>
            ← Admin
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
        {/* LEFT — Syllabus sidebar */}
        <div>
          {/* Subject selector */}
          <div style={{ background: "white", borderRadius: 12, padding: "12px", marginBottom: 12, border: "1px solid #e5e7eb" }}>
            <select value={subject} onChange={(e) => { setSubject(e.target.value); setSelectedTopic(null); }} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, fontWeight: 600 }}>
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
              <div style={{ height: 8, borderRadius: 8, background: TEAL, width: `${Math.min(totalPct, 100)}%`, transition: "width 0.5s" }} />
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{totalPct}% of target reached</p>
          </div>

          {/* Cambridge syllabus topic list */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cambridge Syllabus Order
              </p>
            </div>
            {SYLLABUS_ORDER.map((topic, idx) => {
              const count = topicCounts[topic] ?? 0;
              const target = TOPIC_TARGETS[topic] ?? 100;
              const pct = Math.round((count / target) * 100);
              const isSelected = selectedTopic === topic;
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: isSelected ? "#e8f8f4" : "white",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? TEAL : "#9ca3af", width: 16 }}>
                        {idx + 1}.
                      </span>
                      <p style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? TEAL : "#374151", margin: 0, lineHeight: 1.3 }}>
                        {topic}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: pct >= 80 ? "#16a34a" : pct >= 40 ? TEAL : "#dc2626",
                      background: pct >= 80 ? "#f0fdf4" : pct >= 40 ? "#e8f8f4" : "#fef2f2",
                      borderRadius: 20, padding: "1px 6px",
                    }}>
                      {count}/{target}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "#f3f4f6", borderRadius: 3, marginLeft: 22 }}>
                    <div style={{ height: 3, borderRadius: 3, background: pct >= 80 ? "#16a34a" : pct >= 40 ? TEAL : ORANGE, width: `${pct}%`, transition: "width 0.5s" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Question list */}
        <div>
          {!selectedTopic ? (
            <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 32, margin: "0 0 12px" }}>📚</p>
              <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                Select a topic
              </p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Click any topic from the Cambridge syllabus list to view its questions
              </p>
            </div>
          ) : (
            <div>
              {/* Filters */}
              <div style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 14, border: "1px solid #e5e7eb", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0, marginRight: 4 }}>
                  {selectedTopic}
                </p>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search questions..."
                  style={{ flex: 1, minWidth: 160, padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                {[
                  { label: "Type", value: paperType, setter: setPaperType, options: ["All", "MCQ", "Theory", "Practical"] },
                  { label: "Difficulty", value: difficulty, setter: setDifficulty, options: ["All", "Easy", "Medium", "Hard"] },
                  { label: "Source", value: source, setter: setSource, options: ["All", "MGP_Generated", "Cambridge"] },
                ].map((f) => (
                  <select key={f.label} value={f.value} onChange={(e) => f.setter(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} questions</span>
              </div>

              {loading ? (
                <div style={{ background: "white", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #e5e7eb" }}>
                  <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: `3px solid ${TEAL}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Loading questions...</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ background: "white", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: 32, margin: "0 0 10px" }}>📭</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No questions yet</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px" }}>
                    Generate questions for {selectedTopic} to get started
                  </p>
                  <Link href="/admin/generate-questions?key=mgp2025" style={{ display: "inline-block", background: TEAL, color: "white", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    ⚡ Generate Questions →
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}
                    >
                      {/* Question header */}
                      <div
                        style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                        onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                      >
                        <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, width: 24, flexShrink: 0 }}>
                          {idx + 1}.
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: q.paper_type === "MCQ" ? TEAL : q.paper_type === "Theory" ? "#7c3aed" : ORANGE, background: q.paper_type === "MCQ" ? "#e8f8f4" : q.paper_type === "Theory" ? "#f5f3ff" : "#fff7ed", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                          {q.paper_type ?? "MCQ"}
                        </span>
                        <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 7px", flexShrink: 0, textTransform: "capitalize" }}>
                          {q.difficulty}
                        </span>
                        {q.source === "MGP_Generated" && (
                          <span style={{ fontSize: 10, color: ORANGE, background: "#fff7ed", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                            ⚡ MGP
                          </span>
                        )}
                        {q.source === "Cambridge" && (
                          <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                            📄 Cambridge
                          </span>
                        )}
                        <p style={{ fontSize: 12, color: "#374151", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.question_text.slice(0, 100)}
                        </p>
                        <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
                          {expanded === q.id ? "▲" : "▼"}
                        </span>
                      </div>

                      {/* Expanded */}
                      {expanded === q.id && (
                        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f1f5f9" }}>
                          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "12px 0 10px", background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e5e7eb" }}>
                            {q.question_text}
                          </p>

                          {q.correct_answer && (
                            <div style={{ background: "#e8f8f4", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #a7f3d0" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: "0 0 2px" }}>✓ Correct Answer</p>
                              <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>{q.correct_answer}</p>
                            </div>
                          )}

                          {q.mark_scheme && (
                            <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #ddd6fe" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", margin: "0 0 2px" }}>📋 Mark Scheme</p>
                              <p style={{ fontSize: 12, color: "#374151", margin: 0, whiteSpace: "pre-line" }}>{q.mark_scheme}</p>
                            </div>
                          )}

                          {q.common_mistake && (
                            <div style={{ background: "#fef2f2", borderRadius: 8, padding: "8px 12px", marginBottom: 8, border: "1px solid #fecaca" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", margin: "0 0 2px" }}>⚠️ Common Mistake</p>
                              <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>{q.common_mistake}</p>
                            </div>
                          )}

                          {q.exam_tip && (
                            <div style={{ background: "#fff7ed", borderRadius: 8, padding: "8px 12px", marginBottom: 10, border: "1px solid #fed7aa" }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, margin: "0 0 2px" }}>🎯 Exam Tip</p>
                              <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>{q.exam_tip}</p>
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", gap: 8 }}>
                              {q.syllabus_ref && (
                                <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>
                                  Syllabus {q.syllabus_ref}
                                </span>
                              )}
                              {q.subtopic && (
                                <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>
                                  {q.subtopic}
                                </span>
                              )}
                              {q.year && q.session !== "Generated" && (
                                <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>
                                  {q.year} {q.session}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => void handleDelete(q.id)}
                              disabled={deleting === q.id}
                              style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                            >
                              {deleting === q.id ? "Deleting..." : "🗑 Delete"}
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
