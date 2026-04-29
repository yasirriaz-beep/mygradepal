"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TEAL = "#189080";
const ORANGE = "#f5731e";

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

const SUBTOPICS: Record<string, string[]> = {
  "States of Matter": ["Kinetic particle theory", "Gas laws", "Changes of state"],
  "Atoms, Elements and Compounds": ["Atomic structure", "Isotopes", "Ionic bonding", "Covalent bonding", "Metallic bonding"],
  "Stoichiometry": ["Relative molecular mass", "The mole", "Mole calculations", "Empirical formula", "Gas volumes at RTP"],
  "Electrochemistry": ["Electrolysis basics", "Electrode reactions", "Electroplating", "Fuel cells"],
  "Chemical Energetics": ["Exothermic reactions", "Endothermic reactions", "Bond energies", "Energy profile diagrams"],
  "Chemical Reactions": ["Rate of reaction", "Collision theory", "Catalysts", "Reversible reactions", "Equilibrium"],
  "Acids, Bases and Salts": ["pH scale", "Neutralisation", "Salt preparation", "Titration calculations"],
  "The Periodic Table": ["Group 1 properties", "Group 7 properties", "Period 3 trends", "Transition metals"],
  Metals: ["Reactivity series", "Extraction of metals", "Corrosion and rusting", "Alloys"],
  "Chemistry of the Environment": ["Water treatment", "Air pollution", "Greenhouse effect", "Fertilisers and eutrophication"],
  "Organic Chemistry": ["Alkanes", "Alkenes", "Alcohols", "Carboxylic acids", "Addition polymers", "Esters"],
  "Experimental Techniques & Analysis": ["Filtration and evaporation", "Chromatography", "Distillation", "Flame tests", "Ion tests", "Titration procedure"],
};

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

interface GeneratedQuestion {
  question_text: string;
  options: { A: string; B: string; C: string; D: string } | null;
  correct_answer: string;
  mark_scheme: string;
  mygradepal_explanation: string;
  common_mistake: string;
  exam_tip: string;
  syllabus_ref: string;
  difficulty_level: string;
  command_word: string;
  paper_type: string;
  topic: string;
  subtopic: string;
  approved: boolean;
}

interface TopicProgress {
  topic: string;
  current: number;
  target: number;
  pct: number;
}

const REBALANCE_PLAN = [
  { topic: "Organic Chemistry", subtopic: "Alkanes", count: 10 },
  { topic: "Organic Chemistry", subtopic: "Alkenes", count: 10 },
  { topic: "Organic Chemistry", subtopic: "Alcohols", count: 10 },
  { topic: "Organic Chemistry", subtopic: "Carboxylic acids", count: 10 },
  { topic: "Organic Chemistry", subtopic: "Polymers", count: 10 },
  { topic: "Chemistry of the Environment", subtopic: "Water treatment", count: 10 },
  { topic: "Chemistry of the Environment", subtopic: "Air pollution", count: 10 },
  { topic: "Chemistry of the Environment", subtopic: "Greenhouse effect", count: 10 },
  { topic: "Experimental Techniques & Analysis", subtopic: "Separation techniques", count: 10 },
  { topic: "Experimental Techniques & Analysis", subtopic: "Identification tests", count: 10 },
  { topic: "Experimental Techniques & Analysis", subtopic: "Chromatography", count: 10 },
  { topic: "Metals", subtopic: "Reactivity series", count: 10 },
  { topic: "Metals", subtopic: "Extraction of metals", count: 10 },
  { topic: "States of Matter", subtopic: "Kinetic particle theory", count: 10 },
  { topic: "Chemical Energetics", subtopic: "Bond energies", count: 10 },
];

export default function GenerateQuestionsPage() {
  const [subject, setSubject] = useState("Chemistry");
  const [topic, setTopic] = useState("Stoichiometry");
  const [subtopic, setSubtopic] = useState("The mole");
  const [difficulty, setDifficulty] = useState("Medium");
  const [paperType, setPaperType] = useState("MCQ");
  const [count, setCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceLog, setRebalanceLog] = useState<string[]>([]);
  const [rebalanceStats, setRebalanceStats] = useState<{
    correct_answer: string; count: number; percentage: number
  }[]>([]);

  // Load topic progress
  useEffect(() => {
    fetch(`/api/admin/generate-questions?subject=${subject}`)
      .then((r) => r.json())
      .then((d: { progress: TopicProgress[] }) => setProgress(d.progress ?? []))
      .catch(console.error);
  }, [subject, success]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setQuestions([]);
    setSuccess("");

    try {
      const res = await fetch("/api/admin/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, subtopic, difficulty, paperType, count }),
      });
      const data = (await res.json()) as { questions?: GeneratedQuestion[]; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Generation failed");
        setLoading(false);
        return;
      }

      setQuestions((data.questions ?? []).map((q) => ({ ...q, approved: true })));
      setExpanded(0);
    } catch {
      setError("Network error — please try again");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const approved = questions.filter((q) => q.approved);
    if (approved.length === 0) {
      setError("No questions approved");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/generate-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, subject }),
      });
      const data = (await res.json()) as { saved?: number; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Save failed");
      } else {
        setSuccess(`✓ ${data.saved} questions saved to database!`);
        setQuestions([]);
      }
    } catch {
      setError("Save failed");
    }
    setSaving(false);
  };

  const toggleApprove = (idx: number) => setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, approved: !q.approved } : q)));

  const updateField = (idx: number, field: keyof GeneratedQuestion, value: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));

  const runAutoRebalance = async () => {
    setRebalancing(true);
    setRebalanceLog([]);

    for (let i = 0; i < REBALANCE_PLAN.length; i++) {
      const item = REBALANCE_PLAN[i];
      setRebalanceLog((prev) => [...prev,
        `[${i + 1}/${REBALANCE_PLAN.length}] Generating ${item.count} MCQ for ${item.topic} — ${item.subtopic}...`
      ]);

      try {
        // Generate
        const genRes = await fetch("/api/admin/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: "Chemistry",
            topic: item.topic,
            subtopic: item.subtopic,
            difficulty: "Mixed",
            paperType: "MCQ",
            count: item.count,
          }),
        });

        const genData = (await genRes.json()) as { error?: string; questions?: Record<string, unknown>[] };

        if (genData.error) {
          setRebalanceLog((prev) => [...prev, "  ⚠️ Generation failed — retrying..."]);
          // Retry once
          await new Promise((r) => setTimeout(r, 3000));
          const retryRes = await fetch("/api/admin/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: "Chemistry",
              topic: item.topic,
              subtopic: item.subtopic,
              difficulty: "Mixed",
              paperType: "MCQ",
              count: item.count,
            }),
          });
          const retryData = (await retryRes.json()) as { error?: string; questions?: Record<string, unknown>[] };
          if (retryData.error) {
            setRebalanceLog((prev) => [...prev, "  ❌ Skipped after retry"]);
            continue;
          }
          genData.questions = retryData.questions;
        }

        // Auto-approve all
        const generatedQuestions = (genData.questions ?? []).map((q: Record<string, unknown>) => ({
          ...q, approved: true
        }));

        const saveRes = await fetch("/api/admin/generate-questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: generatedQuestions, subject: "Chemistry" }),
        });

        const saveData = (await saveRes.json()) as {
          saved?: number;
          answer_distribution?: { correct_answer: string; count: number; percentage: number }[];
        };
        if (saveData.answer_distribution) {
          setRebalanceStats(saveData.answer_distribution);
        }
        setRebalanceLog((prev) => [...prev,
          `  ✅ Saved ${saveData.saved ?? 0} questions`
        ]);
      } catch {
        setRebalanceLog((prev) => [...prev, "  ❌ Error — skipped"]);
      }

      // 4 second gap between batches to avoid rate limiting
      await new Promise((r) => setTimeout(r, 4000));
    }

    setRebalanceLog((prev) => [...prev, "\n🎉 Done! Check distribution below."]);
    setRebalancing(false);
  };

  const approvedCount = questions.filter((q) => q.approved).length;
  const subtopics = SUBTOPICS[topic] ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>⚡ Question Generator</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>Generate Cambridge-style expert questions with Claude</p>
        </div>
        <Link href="/admin?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>
          ← Admin
        </Link>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* ── LEFT COLUMN — Controls + Progress ── */}
        <div>
          {/* Generator controls */}
          <div style={{ background: "white", borderRadius: 16, padding: 18, marginBottom: 16, border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>Generate Questions</p>

            {/* Subject */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13 }}>
                <option>Chemistry</option>
                <option>Physics</option>
                <option>Mathematics</option>
                <option>Biology</option>
              </select>
            </div>

            {/* Topic */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>Topic</label>
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSubtopic(SUBTOPICS[e.target.value]?.[0] ?? "");
                }}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13 }}
              >
                {CHEMISTRY_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtopic */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>Subtopic</label>
              <select value={subtopic} onChange={(e) => setSubtopic(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13 }}>
                {subtopics.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Paper type */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Paper Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {["MCQ", "Theory", "Practical"].map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPaperType(pt)}
                    style={{ padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${paperType === pt ? TEAL : "#e5e7eb"}`, background: paperType === pt ? "#e8f8f4" : "white", color: paperType === pt ? TEAL : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Difficulty</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {["Easy", "Medium", "Hard", "Mixed"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{ padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${difficulty === d ? ORANGE : "#e5e7eb"}`, background: difficulty === d ? "#fff7ed" : "white", color: difficulty === d ? ORANGE : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>How many?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {[5, 10, 20, 30].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    style={{ padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${count === n ? TEAL : "#e5e7eb"}`, background: count === n ? "#e8f8f4" : "white", color: count === n ? TEAL : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>⚠️ {error}</p>
              </div>
            )}
            {success && (
              <div style={{ background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "#16a34a", margin: 0 }}>{success}</p>
              </div>
            )}

            <button
              onClick={() => void handleGenerate()}
              disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 10, background: loading ? "#e5e7eb" : TEAL, color: loading ? "#9ca3af" : "white", fontSize: 14, fontWeight: 700, border: "none", cursor: loading ? "default" : "pointer", fontFamily: "'Sora', sans-serif" }}
            >
              {loading ? "⏳ Generating..." : `Generate ${count} Questions →`}
            </button>
            {loading && <p style={{ fontSize: 11, color: "#6b7280", textAlign: "center", margin: "8px 0 0" }}>Takes 15–30 seconds...</p>}
          </div>

          <div style={{
            background: "white", borderRadius: 12,
            padding: "1.25rem", border: "1px solid #e5e7eb",
            marginTop: 16
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
              Auto Rebalance
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
              Automatically generates 150 MCQ questions across 15
              under-represented topics and subtopics. Takes ~10 minutes.
              All questions saved directly — no approval needed.
            </p>

            <button
              onClick={() => void runAutoRebalance()}
              disabled={rebalancing}
              style={{
                background: rebalancing ? "#d1d5db" : "#1D9E75",
                color: "white", border: "none", borderRadius: 8,
                padding: "10px 20px", fontSize: 14, fontWeight: 600,
                cursor: rebalancing ? "default" : "pointer",
                fontFamily: "inherit", marginBottom: 12,
                width: "100%"
              }}
            >
              {rebalancing ? "Running... do not close this tab" : "Start Auto Rebalance →"}
            </button>

            {rebalanceLog.length > 0 && (
              <div style={{
                background: "#f9fafb", borderRadius: 8, padding: 12,
                maxHeight: 300, overflowY: "auto",
                fontFamily: "monospace", fontSize: 12,
                border: "1px solid #e5e7eb"
              }}>
                {rebalanceLog.map((line, i) => (
                  <div key={i} style={{
                    marginBottom: 2,
                    color: line.includes("✅") ? "#1D9E75" :
                           line.includes("❌") ? "#E24B4A" :
                           line.includes("⚠️") ? "#D97706" :
                           line.includes("🎉") ? "#1D9E75" : "#374151"
                  }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
            {rebalanceStats.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#374151" }}>
                {rebalanceStats.map((s) => `${s.correct_answer}: ${s.count} (${s.percentage}%)`).join(" • ")}
              </div>
            )}
          </div>

          {/* Topic progress */}
          <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>📊 Database Progress</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(progress.length > 0 ? progress : CHEMISTRY_TOPICS.map((t) => ({ topic: t, current: 0, target: TOPIC_TARGETS[t] ?? 100, pct: 0 }))).map((p) => (
                <div key={p.topic}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <p style={{ fontSize: 11, color: "#374151", margin: 0, fontWeight: topic === p.topic ? 700 : 400 }}>{p.topic.split(" ").slice(0, 2).join(" ")}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
                      {p.current}/{p.target}
                    </p>
                  </div>
                  <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4 }}>
                    <div style={{ height: 4, borderRadius: 4, background: p.pct >= 80 ? "#16a34a" : p.pct >= 40 ? TEAL : ORANGE, width: `${p.pct}%`, transition: "width 0.5s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Question preview ── */}
        <div>
          {questions.length === 0 ? (
            <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: 40, margin: "0 0 12px" }}>⚡</p>
              <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Ready to Generate</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Select your options and click Generate.
                <br />
                Claude will create {count} Cambridge-style {paperType} questions
                <br />
                for {topic} at {difficulty} difficulty.
              </p>
            </div>
          ) : (
            <div>
              {/* Approve bar */}
              <div style={{ background: "white", borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>
                  {approvedCount} of {questions.length} approved
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setQuestions((q) => q.map((x) => ({ ...x, approved: true })))} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                    All
                  </button>
                  <button onClick={() => setQuestions((q) => q.map((x) => ({ ...x, approved: false })))} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                    None
                  </button>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving || approvedCount === 0}
                    style={{ padding: "5px 16px", borderRadius: 8, background: saving || approvedCount === 0 ? "#e5e7eb" : TEAL, color: saving || approvedCount === 0 ? "#9ca3af" : "white", border: "none", fontSize: 12, fontWeight: 700, cursor: saving || approvedCount === 0 ? "default" : "pointer" }}
                  >
                    {saving ? "Saving..." : `Save ${approvedCount} →`}
                  </button>
                </div>
              </div>

              {/* Question cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questions.map((q, idx) => (
                  <div key={idx} style={{ background: q.approved ? "#f0fdf9" : "#fafafa", border: `1.5px solid ${q.approved ? TEAL : "#e5e7eb"}`, borderRadius: 14, overflow: "hidden", opacity: q.approved ? 1 : 0.6 }}>
                    {/* Card header */}
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(expanded === idx ? null : idx)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: "#e8f8f4", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>Q{idx + 1}</span>
                        <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{q.difficulty_level}</span>
                        <span style={{ fontSize: 11, color: ORANGE, background: "#fff7ed", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{q.command_word}</span>
                        <p style={{ fontSize: 12, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question_text.slice(0, 80)}...</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleApprove(idx);
                          }}
                          style={{ padding: "4px 10px", borderRadius: 8, border: `1.5px solid ${q.approved ? TEAL : "#e5e7eb"}`, background: q.approved ? TEAL : "white", color: q.approved ? "white" : "#9ca3af", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          {q.approved ? "✓" : "Approve"}
                        </button>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{expanded === idx ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded view */}
                    {expanded === idx && (
                      <div style={{ padding: "0 14px 14px", borderTop: "1px solid #e5e7eb" }}>
                        {/* Question text */}
                        <div style={{ marginTop: 12, marginBottom: 10 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Question</label>
                          <textarea
                            value={q.question_text}
                            onChange={(e) => updateField(idx, "question_text", e.target.value)}
                            rows={3}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, lineHeight: 1.6, boxSizing: "border-box", resize: "vertical" }}
                          />
                        </div>

                        {/* MCQ options */}
                        {q.options && (
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Options</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              {(["A", "B", "C", "D"] as const).map((opt) => (
                                <div key={opt} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: q.correct_answer === opt ? TEAL : "#9ca3af", width: 16, flexShrink: 0 }}>{opt}</span>
                                  <input
                                    value={q.options?.[opt] ?? ""}
                                    onChange={(e) => {
                                      const newOpts = { ...q.options, [opt]: e.target.value };
                                      setQuestions((prev) => prev.map((x, i) => (i === idx ? { ...x, options: newOpts as typeof q.options } : x)));
                                    }}
                                    style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${q.correct_answer === opt ? TEAL : "#e5e7eb"}`, fontSize: 12, background: q.correct_answer === opt ? "#e8f8f4" : "white" }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, color: "#6b7280" }}>Correct answer:</span>
                              {["A", "B", "C", "D"].map((opt) => (
                                <button key={opt} onClick={() => updateField(idx, "correct_answer", opt)} style={{ padding: "3px 10px", borderRadius: 6, border: `1.5px solid ${q.correct_answer === opt ? TEAL : "#e5e7eb"}`, background: q.correct_answer === opt ? TEAL : "white", color: q.correct_answer === opt ? "white" : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mark scheme */}
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase" }}>Mark Scheme</label>
                          <textarea value={q.mark_scheme} onChange={(e) => updateField(idx, "mark_scheme", e.target.value)} rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box", resize: "vertical" }} />
                        </div>

                        {/* Explanation */}
                        <div style={{ background: "#e8f8f4", borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: "1px solid #a7f3d0" }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: TEAL, display: "block", marginBottom: 4 }}>💡 MyGradePal Explanation</label>
                          <textarea value={q.mygradepal_explanation} onChange={(e) => updateField(idx, "mygradepal_explanation", e.target.value)} rows={2} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #a7f3d0", fontSize: 12, background: "white", boxSizing: "border-box", resize: "vertical" }} />
                        </div>

                        {/* Common mistake + exam tip */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ background: "#fef2f2", borderRadius: 10, padding: "8px 10px", border: "1px solid #fecaca" }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", display: "block", marginBottom: 4 }}>⚠️ Common Mistake</label>
                            <textarea value={q.common_mistake} onChange={(e) => updateField(idx, "common_mistake", e.target.value)} rows={2} style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid #fecaca", fontSize: 11, background: "white", boxSizing: "border-box", resize: "vertical" }} />
                          </div>
                          <div style={{ background: "#fff7ed", borderRadius: 10, padding: "8px 10px", border: "1px solid #fed7aa" }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: ORANGE, display: "block", marginBottom: 4 }}>🎯 Exam Tip</label>
                            <textarea value={q.exam_tip} onChange={(e) => updateField(idx, "exam_tip", e.target.value)} rows={2} style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid #fed7aa", fontSize: 11, background: "white", boxSizing: "border-box", resize: "vertical" }} />
                          </div>
                        </div>

                        {/* Syllabus ref + topic */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>Syllabus Ref</label>
                            <input value={q.syllabus_ref} onChange={(e) => updateField(idx, "syllabus_ref", e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>Topic</label>
                            <input value={q.topic} onChange={(e) => updateField(idx, "topic", e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>Subtopic</label>
                            <input value={q.subtopic} onChange={(e) => updateField(idx, "subtopic", e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom save bar */}
              {questions.length > 0 && (
                <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", marginTop: 14, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                    <strong>{approvedCount}</strong> questions ready to save
                  </p>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving || approvedCount === 0}
                    style={{ padding: "10px 24px", borderRadius: 10, background: saving || approvedCount === 0 ? "#e5e7eb" : TEAL, color: saving || approvedCount === 0 ? "#9ca3af" : "white", border: "none", fontSize: 14, fontWeight: 700, cursor: saving || approvedCount === 0 ? "default" : "pointer", fontFamily: "'Sora', sans-serif" }}
                  >
                    {saving ? "Saving..." : `Save ${approvedCount} to Database →`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
