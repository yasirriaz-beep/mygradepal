"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TEAL = "#189080";
const ORANGE = "#f5731e";

interface Gap {
  topic: string;
  totalCount: number;
  target: number;
  totalGap: number;
  mcqGap: number;
  theoryGap: number;
  practGap: number;
  uncoveredSubtopics: string[];
  complete: boolean;
}

interface BatchResult {
  topic: string;
  paperType: string;
  subtopic: string;
  saved: number;
  error?: string;
}

export default function AutoFillPage() {
  const [subject, setSubject] = useState("Chemistry");
  const [autoApprove, setAutoApprove] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [totalGap, setTotalGap] = useState(0);
  const [totalCurrent, setTotalCurrent] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [log, setLog] = useState<BatchResult[]>([]);
  const [currentTask, setCurrentTask] = useState("");
  const [progress, setProgress] = useState(0);

  const loadGaps = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/auto-generate?subject=${subject}`);
    const data = await res.json() as { gaps: Gap[]; totalGap: number; totalCurrent: number; totalTarget: number };
    setGaps(data.gaps ?? []);
    setTotalGap(data.totalGap ?? 0);
    setTotalCurrent(data.totalCurrent ?? 0);
    setTotalTarget(data.totalTarget ?? 0);
    setLoading(false);
  };

  useEffect(() => { void loadGaps(); }, [subject]);

  const runAutoFill = async () => {
    setRunning(true);
    setStopFlag(false);
    setLog([]);
    setProgress(0);

    // Build task queue from gaps
    const tasks: Array<{ topic: string; paperType: "MCQ" | "Theory" | "Practical"; needed: number }> = [];

    for (const gap of gaps) {
      if (gap.complete) continue;
      if (gap.mcqGap > 0) tasks.push({ topic: gap.topic, paperType: "MCQ", needed: gap.mcqGap });
      if (gap.theoryGap > 0) tasks.push({ topic: gap.topic, paperType: "Theory", needed: gap.theoryGap });
      if (gap.practGap > 0) tasks.push({ topic: gap.topic, paperType: "Practical", needed: gap.practGap });
    }

    let completed = 0;
    const totalTasks = tasks.length;

    for (const task of tasks) {
      if (stopFlag) break;

      // How many batches needed for this task
      const batches = Math.ceil(task.needed / batchSize);

      for (let b = 0; b < batches; b++) {
        if (stopFlag) break;

        const thisSize = Math.min(batchSize, task.needed - b * batchSize);
        setCurrentTask(`${task.topic} — ${task.paperType} (batch ${b + 1}/${batches})`);

        try {
          const res = await fetch("/api/admin/auto-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject,
              topic: task.topic,
              paperType: task.paperType,
              batchSize: thisSize,
              autoApprove,
            }),
          });
          const data = await res.json() as BatchResult;

          setLog((prev) => [{
            topic: task.topic,
            paperType: task.paperType,
            subtopic: data.subtopic ?? "",
            saved: data.saved ?? 0,
            error: data.error,
          }, ...prev]);
        } catch (err) {
          setLog((prev) => [{
            topic: task.topic,
            paperType: task.paperType,
            subtopic: "",
            saved: 0,
            error: "Network error",
          }, ...prev]);
        }

        // Small delay between batches to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1500));
      }

      completed++;
      setProgress(Math.round((completed / totalTasks) * 100));
    }

    setCurrentTask("");
    setRunning(false);
    void loadGaps(); // refresh gaps
  };

  const incompleteTasks = gaps.filter((g) => !g.complete).length;
  const completedTopics = gaps.filter((g) => g.complete).length;
  const overallPct = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>
            🤖 Auto-Fill Database
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
            Automatically generate questions to hit all topic targets
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/question-bank?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>📚 Bank</Link>
          <Link href="/admin?key=mgp2025" style={{ fontSize: 13, color: "white", textDecoration: "none", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 14px" }}>← Admin</Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {/* Settings */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px" }}>
            Settings
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13 }}>
                <option>Chemistry</option>
                <option>Physics</option>
                <option>Mathematics</option>
                <option>Biology</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Batch size per call</label>
              <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13 }}>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={20}>20 questions</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Save mode</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="radio" checked={autoApprove} onChange={() => setAutoApprove(true)} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Auto-approve</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Save directly — fastest</p>
                  </div>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="radio" checked={!autoApprove} onChange={() => setAutoApprove(false)} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Review first</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Save to pending — safer</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0 }}>
                {subject} Question Bank — {totalCurrent}/{totalTarget} questions
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, margin: 0 }}>{overallPct}%</p>
            </div>
            <div style={{ height: 10, background: "#e5e7eb", borderRadius: 10, marginBottom: 8 }}>
              <div style={{ height: 10, borderRadius: 10, background: TEAL, width: `${overallPct}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <p style={{ fontSize: 12, color: "#16a34a", margin: 0 }}>✓ {completedTopics} topics complete</p>
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>⚡ {incompleteTasks} topics need questions</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{totalGap} questions to generate</p>
            </div>
          </div>

          {/* Running progress */}
          {running && (
            <div style={{ background: "#e8f8f4", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid #a7f3d0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, margin: 0 }}>⏳ Generating...</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, margin: 0 }}>{progress}%</p>
              </div>
              <div style={{ height: 6, background: "#a7f3d0", borderRadius: 6, marginBottom: 6 }}>
                <div style={{ height: 6, borderRadius: 6, background: TEAL, width: `${progress}%`, transition: "width 0.3s" }} />
              </div>
              <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>Currently: {currentTask}</p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {!running ? (
              <button
                onClick={() => void runAutoFill()}
                disabled={loading || incompleteTasks === 0}
                style={{ flex: 1, padding: "13px", borderRadius: 12, background: incompleteTasks === 0 ? "#e5e7eb" : TEAL, color: incompleteTasks === 0 ? "#9ca3af" : "white", fontSize: 14, fontWeight: 700, border: "none", cursor: incompleteTasks === 0 ? "default" : "pointer", fontFamily: "'Sora', sans-serif" }}
              >
                {incompleteTasks === 0 ? "✓ All targets reached!" : `🤖 Auto-Fill ${totalGap} Missing Questions`}
              </button>
            ) : (
              <button
                onClick={() => setStopFlag(true)}
                style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#dc2626", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
              >
                ⏹ Stop Generation
              </button>
            )}
            <button
              onClick={() => void loadGaps()}
              style={{ padding: "13px 20px", borderRadius: 12, background: "white", color: "#374151", fontSize: 13, fontWeight: 600, border: "1.5px solid #e5e7eb", cursor: "pointer" }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Gap breakdown */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Topic Gap Analysis
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gaps.map((gap, idx) => (
              <div key={gap.topic} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: gap.complete ? "#f0fdf4" : "#fafafa", borderRadius: 10, border: `1px solid ${gap.complete ? "#a7f3d0" : "#e5e7eb"}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", width: 20, flexShrink: 0 }}>{idx + 1}.</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: gap.complete ? "#16a34a" : "#374151", margin: 0 }}>{gap.topic}</p>
                    <p style={{ fontSize: 12, color: gap.complete ? "#16a34a" : "#6b7280", margin: 0 }}>{gap.totalCount}/{gap.target}</p>
                  </div>
                  <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4 }}>
                    <div style={{ height: 4, borderRadius: 4, background: gap.complete ? "#16a34a" : TEAL, width: `${Math.min(Math.round((gap.totalCount / gap.target) * 100), 100)}%` }} />
                  </div>
                </div>
                {!gap.complete && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {gap.mcqGap > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "#e8f8f4", borderRadius: 6, padding: "2px 6px" }}>MCQ -{gap.mcqGap}</span>}
                    {gap.theoryGap > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: "#7c3aed", background: "#f5f3ff", borderRadius: 6, padding: "2px 6px" }}>Theory -{gap.theoryGap}</span>}
                    {gap.practGap > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: ORANGE, background: "#fff7ed", borderRadius: 6, padding: "2px 6px" }}>Pract -{gap.practGap}</span>}
                  </div>
                )}
                {gap.complete && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓ Done</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Generation log */}
        {log.length > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
              Generation Log
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
              {log.map((entry, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: entry.error ? "#fef2f2" : "#f0fdf4", borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>{entry.error ? "❌" : "✓"}</span>
                  <p style={{ fontSize: 12, color: entry.error ? "#dc2626" : "#374151", margin: 0, flex: 1 }}>
                    {entry.topic} — {entry.paperType} — {entry.subtopic}
                  </p>
                  {!entry.error && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: "#e8f8f4", borderRadius: 6, padding: "2px 8px" }}>
                      +{entry.saved} saved
                    </span>
                  )}
                  {entry.error && (
                    <span style={{ fontSize: 11, color: "#dc2626" }}>{entry.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
