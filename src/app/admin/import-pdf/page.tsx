"use client";
import { useRef, useState } from "react";
import Link from "next/link";

const TEAL = "#189080";
const ORANGE = "#f5731e";

const SUBJECTS = [
  { name: "Chemistry", code: "0620" },
  { name: "Physics", code: "0625" },
  { name: "Mathematics", code: "0580" },
  { name: "Biology", code: "0610" },
  { name: "English", code: "0510" },
  { name: "Pakistan Studies", code: "0448" },
];

const SESSIONS = ["Feb/Mar", "May/June", "Oct/Nov"];
const PAPERS = ["1", "2", "3", "4", "5", "6"];
const YEARS = Array.from({ length: 15 }, (_, i) => String(2024 - i));

interface ExtractedQuestion {
  question_number: string;
  question_text: string;
  marks: number;
  topic: string;
  subtopic: string;
  difficulty: string;
  mark_scheme: string;
  approved: boolean;
}

interface Meta {
  subject: string;
  year: string;
  session: string;
  paper: string;
  code: string;
  total: number;
}

export default function ImportPDFPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("Chemistry");
  const [year, setYear] = useState("2023");
  const [session, setSession] = useState("May/June");
  const [paper, setPaper] = useState("2");
  const [paperType, setPaperType] = useState<"question" | "markscheme">("question");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  const paperCode = SUBJECTS.find((s) => s.name === subject)?.code ?? "0620";

  const handleExtract = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a PDF file");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("File must be a PDF");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("PDF must be under 20MB");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("subject", subject);
    formData.append("year", year);
    formData.append("session", session);
    formData.append("paper", paper);
    formData.append("code", paperCode);
    formData.append("type", paperType);

    try {
      const res = await fetch("/api/admin/import-pdf", { method: "POST", body: formData });
      const data = (await res.json()) as { questions?: ExtractedQuestion[]; meta?: Meta; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Extraction failed");
        setLoading(false);
        return;
      }

      const withApproval = (data.questions ?? []).map((q) => ({ ...q, approved: true }));
      setQuestions(withApproval);
      setMeta(data.meta ?? null);
    } catch {
      setError("Network error — please try again");
    }

    setLoading(false);
  };

  const toggleApprove = (idx: number) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, approved: !q.approved } : q)));
  };

  const updateField = (idx: number, field: keyof ExtractedQuestion, value: string | number) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const handleSave = async () => {
    if (!meta) return;
    const approved = questions.filter((q) => q.approved);
    if (approved.length === 0) {
      setError("No questions selected to save");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/import-pdf", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, meta }),
      });
      const data = (await res.json()) as { saved?: number; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Save failed");
      } else {
        setSuccess(`✓ ${data.saved} questions saved to database successfully!`);
        setQuestions([]);
        setMeta(null);
        setSelectedFileName("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setError("Save failed — please try again");
    }

    setSaving(false);
  };

  const approvedCount = questions.filter((q) => q.approved).length;

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
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>
            📄 PDF Import Tool
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
            Upload Cambridge past papers — Claude extracts questions automatically
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

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: "20px",
            marginBottom: 16,
            border: "1px solid #e5e7eb",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 16px",
            }}
          >
            Step 1 — Select Paper Details
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 13,
                  background: "white",
                }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 13,
                  background: "white",
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Session
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 13,
                  background: "white",
                }}
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Paper Number
              </label>
              <select
                value={paper}
                onChange={(e) => setPaper(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 13,
                  background: "white",
                }}
              >
                {PAPERS.map((p) => (
                  <option key={p} value={p}>
                    Paper {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Paper Type
              </label>
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value as "question" | "markscheme")}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 13,
                  background: "white",
                }}
              >
                <option value="question">Question Paper</option>
                <option value="markscheme">Mark Scheme</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Paper Code
              </label>
              <div
                style={{
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 13,
                  background: "#f8fafc",
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                {paperCode}/{year}/{session === "May/June" ? "s" : session === "Oct/Nov" ? "w" : "m"}
                {year.slice(2)}/qp{paper}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: "20px",
            marginBottom: 16,
            border: "1px solid #e5e7eb",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 16px",
            }}
          >
            Step 2 — Upload PDF
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed #e5e7eb",
              borderRadius: 12,
              padding: "32px",
              textAlign: "center",
              cursor: "pointer",
              background: "#fafafa",
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 32, margin: "0 0 8px" }}>📄</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Click to upload PDF</p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Download from papacambridge.com · Max 20MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              setError("");
              setSelectedFileName(e.target.files?.[0]?.name ?? "");
            }}
          />

          {selectedFileName && (
            <p style={{ fontSize: 13, color: TEAL, fontWeight: 600, margin: "0 0 12px" }}>✓ {selectedFileName}</p>
          )}

          <div
            style={{
              background: "#f0faf8",
              borderRadius: 10,
              padding: "10px 14px",
              border: "1px solid #a7f3d0",
              marginBottom: 14,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: TEAL, margin: "0 0 4px" }}>How to download from PapaCambridge:</p>
            <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>
              1. Go to papacambridge.com → IGCSE → {subject}
              <br />
              2. Select year and session
              <br />
              3. Download the Question Paper PDF
              <br />
              4. Upload it here — Claude will extract all questions automatically
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13, color: "#16a34a", margin: 0 }}>{success}</p>
            </div>
          )}

          <button
            onClick={() => void handleExtract()}
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              background: loading ? "#e5e7eb" : TEAL,
              color: loading ? "#9ca3af" : "white",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "default" : "pointer",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {loading ? "⏳ Claude is reading the PDF..." : "Extract Questions →"}
          </button>

          {loading && (
            <p style={{ fontSize: 12, color: "#6b7280", textAlign: "center", margin: "10px 0 0" }}>
              This takes 20–40 seconds depending on PDF size...
            </p>
          )}
        </div>

        {questions.length > 0 && meta && (
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "20px",
              marginBottom: 16,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: 0,
                  }}
                >
                  Step 3 — Review & Approve
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                  {meta.total} questions extracted · {approvedCount} approved · {meta.subject} {meta.year} {meta.session}{" "}
                  P{meta.paper}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setQuestions((q) => q.map((x) => ({ ...x, approved: true })))}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  Select all
                </button>
                <button
                  onClick={() => setQuestions((q) => q.map((x) => ({ ...x, approved: false })))}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    border: `1.5px solid ${q.approved ? TEAL : "#e5e7eb"}`,
                    borderRadius: 12,
                    padding: "14px",
                    background: q.approved ? "#f0fdf9" : "#fafafa",
                    opacity: q.approved ? 1 : 0.6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: TEAL,
                          background: "#e8f8f4",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                      >
                        Q{q.question_number}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          background: "#f3f4f6",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                      >
                        {q.marks} mark{q.marks !== 1 ? "s" : ""}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: ORANGE,
                          background: "#fff7ed",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleApprove(idx)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${q.approved ? TEAL : "#e5e7eb"}`,
                        background: q.approved ? TEAL : "white",
                        color: q.approved ? "white" : "#9ca3af",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {q.approved ? "✓ Approved" : "Approve"}
                    </button>
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      lineHeight: 1.6,
                      margin: "0 0 10px",
                      background: "white",
                      borderRadius: 8,
                      padding: "10px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {q.question_text}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>
                        Topic
                      </label>
                      <input
                        value={q.topic}
                        onChange={(e) => updateField(idx, "topic", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 8px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>
                        Subtopic
                      </label>
                      <input
                        value={q.subtopic}
                        onChange={(e) => updateField(idx, "subtopic", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 8px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 3 }}>
                        Marks
                      </label>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) => updateField(idx, "marks", parseInt(e.target.value, 10) || 0)}
                        style={{
                          width: "100%",
                          padding: "7px 8px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 20,
                padding: "16px",
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>
                  Ready to save {approvedCount} questions
                </p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{questions.length - approvedCount} skipped</p>
              </div>
              <button
                onClick={() => void handleSave()}
                disabled={saving || approvedCount === 0}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 12,
                  background: saving || approvedCount === 0 ? "#e5e7eb" : TEAL,
                  color: saving || approvedCount === 0 ? "#9ca3af" : "white",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: saving || approvedCount === 0 ? "default" : "pointer",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {saving ? "Saving to database..." : `Save ${approvedCount} Questions to Database →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
