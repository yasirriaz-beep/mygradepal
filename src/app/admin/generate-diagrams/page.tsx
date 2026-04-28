"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TEAL = "#189080";

interface DiagramQuestion {
  id: string;
  topic: string;
  question_text: string;
  diagram_url: string | null;
}

interface GenerateResult {
  id: string;
  success: boolean;
  error?: string;
}

export default function GenerateDiagramsPage() {
  const [questions, setQuestions] = useState<DiagramQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<GenerateResult[]>([]);
  const [current, setCurrent] = useState("");
  const [progress, setProgress] = useState(0);
  const [stopFlag, setStopFlag] = useState(false);

  useEffect(() => {
    fetch("/api/admin/generate-diagrams")
      .then((r) => r.json())
      .then((d: { questions: DiagramQuestion[] }) => {
        setQuestions(d.questions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const runGeneration = async () => {
    setRunning(true);
    setStopFlag(false);
    setResults([]);
    setProgress(0);

    const pending = questions.filter((q) => !q.diagram_url);

    for (let i = 0; i < pending.length; i++) {
      if (stopFlag) break;

      const q = pending[i];
      setCurrent(`${q.topic} — ${q.question_text.slice(0, 60)}...`);

      try {
        const res = await fetch("/api/generate-diagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, questionText: q.question_text }),
        });
        const data = (await res.json()) as { diagramUrl?: string; error?: string };

        setResults((prev) => [
          {
            id: q.id,
            success: !!data.diagramUrl,
            error: data.error,
          },
          ...prev,
        ]);

        if (data.diagramUrl) {
          setQuestions((prev) =>
            prev.map((x) => (x.id === q.id ? { ...x, diagram_url: data.diagramUrl! } : x))
          );
        }
      } catch {
        setResults((prev) => [{ id: q.id, success: false, error: "Network error" }, ...prev]);
      }

      setProgress(Math.round(((i + 1) / pending.length) * 100));
      await new Promise((r) => setTimeout(r, 2000)); // 2s delay between requests
    }

    setCurrent("");
    setRunning(false);
  };

  const pending = questions.filter((q) => !q.diagram_url).length;
  const completed = questions.filter((q) => !!q.diagram_url).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf8", fontFamily: "'DM Sans', sans-serif" }}>
      <div
        style={{
          background: TEAL,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "white",
              margin: 0,
            }}
          >
            🎨 Generate Diagrams
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
            AI-generated diagrams for questions that reference visual content
          </p>
        </div>
        <Link
          href="/admin?key=mgp2025"
          style={{
            fontSize: 13,
            color: "white",
            textDecoration: "none",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "7px 14px",
          }}
        >
          ← Admin
        </Link>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total flagged", value: questions.length, color: "#374151" },
            { label: "Need diagrams", value: pending, color: "#dc2626" },
            { label: "Done", value: completed, color: TEAL },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "white",
                borderRadius: 12,
                padding: "14px 16px",
                border: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar when running */}
        {running && (
          <div
            style={{
              background: "#e8f8f4",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
              border: "1px solid #a7f3d0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, margin: 0 }}>Generating...</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, margin: 0 }}>{progress}%</p>
            </div>
            <div style={{ height: 6, background: "#a7f3d0", borderRadius: 6, marginBottom: 8 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 6,
                  background: TEAL,
                  width: `${progress}%`,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>{current}</p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {!running ? (
            <button
              onClick={() => void runGeneration()}
              disabled={loading || pending === 0}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 12,
                background: pending === 0 ? "#e5e7eb" : TEAL,
                color: pending === 0 ? "#9ca3af" : "white",
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                cursor: pending === 0 ? "default" : "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {pending === 0 ? "✓ All diagrams done!" : `🎨 Generate ${pending} Diagrams`}
            </button>
          ) : (
            <button
              onClick={() => setStopFlag(true)}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 12,
                background: "#dc2626",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              ⏹ Stop
            </button>
          )}
        </div>

        {/* Results log */}
        {results.length > 0 && (
          <div
            style={{ background: "white", borderRadius: 14, padding: "16px", border: "1px solid #e5e7eb" }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 12px",
              }}
            >
              Generation Log
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: r.success ? "#f0fdf4" : "#fef2f2",
                    borderRadius: 8,
                  }}
                >
                  <span>{r.success ? "✓" : "❌"}</span>
                  <p style={{ fontSize: 12, color: r.success ? "#16a34a" : "#dc2626", margin: 0 }}>
                    {r.success ? "Diagram generated" : `Failed: ${r.error ?? "unknown"}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question list */}
        {!loading && (
          <div style={{ marginTop: 16 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 10px",
              }}
            >
              Questions Needing Diagrams
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions
                .filter((q) => !q.diagram_url)
                .slice(0, 20)
                .map((q) => (
                  <div
                    key={q.id}
                    style={{
                      background: "white",
                      borderRadius: 10,
                      padding: "10px 14px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: "0 0 4px" }}>{q.topic}</p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#374151",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {q.question_text.slice(0, 120)}...
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
