"use client";

import Link from "next/link";
import { DragEvent, Fragment, useMemo, useRef, useState } from "react";
import SentryErrorBoundary from "@/components/SentryErrorBoundary";

type Subject = "Chemistry" | "Physics" | "Mathematics" | "Biology";
type PaperType = "Paper 2" | "Paper 4" | "Paper 6";
type ZoneState = "idle" | "valid" | "invalid";

type ExtractedQuestion = {
  question_id: string;
  question_text: string;
  answer: string;
  figure_description?: string;
  topic: string;
  subtopic: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  ao_level?: "AO1" | "AO2" | "AO3";
  diagram_required: boolean;
  approved: boolean;
};

const SUBJECTS: Array<{ label: string; value: Subject }> = [
  { label: "Chemistry 0620", value: "Chemistry" },
  { label: "Physics 0625", value: "Physics" },
  { label: "Maths 0580", value: "Mathematics" },
  { label: "Biology 0610", value: "Biology" },
];

const PAPER_TYPES: PaperType[] = ["Paper 2", "Paper 4", "Paper 6"];

function detectSubjectFromFilename(name: string): Subject | null {
  const lower = name.toLowerCase();
  if (lower.includes("0620")) return "Chemistry";
  if (lower.includes("0625")) return "Physics";
  if (lower.includes("0580")) return "Mathematics";
  if (lower.includes("0610")) return "Biology";
  return null;
}

function detectPaperTypeFromFilename(name: string): PaperType | null {
  const lower = name.toLowerCase();
  const match = lower.match(/_(\d{2})\.pdf$/) ?? lower.match(/_(\d{2})_/);
  const paperCode = match?.[1];
  if (!paperCode) return null;
  if (paperCode.startsWith("2")) return "Paper 2";
  if (paperCode.startsWith("4")) return "Paper 4";
  if (paperCode.startsWith("6")) return "Paper 6";
  return null;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImportPDFPage() {
  const qpInputRef = useRef<HTMLInputElement>(null);
  const msInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState<Subject>("Chemistry");
  const [paperType, setPaperType] = useState<PaperType>("Paper 4");

  const [qpFile, setQpFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [qpZoneState, setQpZoneState] = useState<ZoneState>("idle");
  const [msZoneState, setMsZoneState] = useState<ZoneState>("idle");

  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [subjectAutoDetected, setSubjectAutoDetected] = useState(false);
  const [paperTypeAutoDetected, setPaperTypeAutoDetected] = useState(false);

  const approvedCount = useMemo(
    () => questions.filter((q) => q.approved).length,
    [questions],
  );
  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + Number(q.marks || 0), 0),
    [questions],
  );
  const diagramCount = useMemo(
    () => questions.filter((q) => q.diagram_required).length,
    [questions],
  );

  const canExtract = Boolean(qpFile && msFile && subject && paperType && !loading);

  const zoneClass = (state: ZoneState) => {
    if (state === "valid") return "border-green-500 bg-green-50";
    if (state === "invalid") return "border-red-500 bg-red-50";
    return "border-slate-300 bg-white";
  };

  const setFile = (file: File | null, target: "qp" | "ms") => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      if (target === "qp") setQpZoneState("invalid");
      if (target === "ms") setMsZoneState("invalid");
      return;
    }

    setError("");
    if (target === "qp") {
      setQpFile(file);
      setQpZoneState("valid");
    } else {
      setMsFile(file);
      setMsZoneState("valid");
    }

    const detectedSubject = detectSubjectFromFilename(file.name);
    if (detectedSubject) {
      setSubject(detectedSubject);
      setSubjectAutoDetected(true);
    }

    const detectedPaperType = detectPaperTypeFromFilename(file.name);
    if (detectedPaperType) {
      setPaperType(detectedPaperType);
      setPaperTypeAutoDetected(true);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, target: "qp" | "ms") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    setFile(file, target);
  };

  const handleExtract = async () => {
    if (!canExtract || !qpFile || !msFile) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setQuestions([]);

    const formData = new FormData();
    formData.append("qp_pdf", qpFile);
    formData.append("ms_pdf", msFile);
    formData.append("subject", subject);
    formData.append("paper_type", paperType);

    try {
      const res = await fetch("/api/admin/extract-pdf", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Extraction failed.");
      } else {
        const extracted = (await res.json()) as ExtractedQuestion[];
        setQuestions(extracted.map((q) => ({ ...q, approved: true })));
      }
    } catch {
      setError("Network error during extraction.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.question_id === id ? { ...q, approved: false } : q)),
    );
  };

  const handleApproveAll = async () => {
    if (approvedCount === 0) {
      setError("No approved questions to save.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/extract-pdf", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { subject, paperType },
          questions,
        }),
      });
      const data = (await res.json()) as { saved?: number; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Save failed.");
      } else {
        setSuccess(`${data.saved ?? 0} questions saved to database`);
      }
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SentryErrorBoundary>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Admin PDF Extraction</h1>
          <Link href="/admin?key=mgp2025" className="text-sm text-teal-700 hover:text-teal-900">
            Back to Admin
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed p-5 transition ${zoneClass(qpZoneState)}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, "qp")}
            onClick={() => qpInputRef.current?.click()}
          >
            <p className="text-sm font-semibold text-slate-900">Question Paper (QP)</p>
            <p className="mt-2 text-xs text-slate-500">
              {qpFile
                ? `${qpFile.name} • ${formatFileSize(qpFile.size)}`
                : "Drop 1 PDF or click to select"}
            </p>
          </div>

          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed p-5 transition ${zoneClass(msZoneState)}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, "ms")}
            onClick={() => msInputRef.current?.click()}
          >
            <p className="text-sm font-semibold text-slate-900">Mark Scheme (MS)</p>
            <p className="mt-2 text-xs text-slate-500">
              {msFile
                ? `${msFile.name} • ${formatFileSize(msFile.size)}`
                : "Drop 1 PDF or click to select"}
            </p>
          </div>
        </div>

        <input
          ref={qpInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null, "qp")}
        />
        <input
          ref={msInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null, "ms")}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <select
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value as Subject);
                setSubjectAutoDetected(false);
              }}
            >
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {subjectAutoDetected && (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                Auto-detected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={paperType}
              onChange={(e) => {
                setPaperType(e.target.value as PaperType);
                setPaperTypeAutoDetected(false);
              }}
            >
              {PAPER_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {paperTypeAutoDetected && (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                Auto-detected
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => void handleExtract()}
            disabled={!canExtract}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "Extracting..." : "Extract"}
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              {questions.length} questions extracted | {totalMarks} marks total | {diagramCount} diagrams
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">question_id</th>
                    <th className="px-3 py-2">topic</th>
                    <th className="px-3 py-2">subtopic</th>
                    <th className="px-3 py-2">marks</th>
                    <th className="px-3 py-2">difficulty</th>
                    <th className="px-3 py-2">ao_level</th>
                    <th className="px-3 py-2">diagram_required</th>
                    <th className="px-3 py-2">actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {questions.map((q) => (
                    <Fragment key={q.question_id}>
                      <tr className={!q.approved ? "opacity-40" : ""}>
                        <td className="px-3 py-2">{q.question_id}</td>
                        <td className="px-3 py-2">{q.topic}</td>
                        <td className="px-3 py-2">{q.subtopic}</td>
                        <td className="px-3 py-2">{q.marks}</td>
                        <td className="px-3 py-2">{q.difficulty}</td>
                        <td className="px-3 py-2">{q.ao_level ?? ""}</td>
                        <td className="px-3 py-2">{String(q.diagram_required)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                              onClick={() =>
                                setExpandedRow((prev) => (prev === q.question_id ? null : q.question_id))
                              }
                            >
                              {expandedRow === q.question_id ? "Hide" : "Expand"}
                            </button>
                            <button
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                              onClick={() => handleReject(q.question_id)}
                              title="Reject question"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === q.question_id && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50 px-4 py-3">
                            <p className="mb-2 text-sm text-slate-800">
                              <span className="font-semibold">question_text:</span> {q.question_text}
                            </p>
                            <p className="mb-2 text-sm text-slate-800">
                              <span className="font-semibold">answer:</span> {q.answer}
                            </p>
                            <p className="text-sm text-slate-800">
                              <span className="font-semibold">figure_description:</span>{" "}
                              {q.figure_description ?? ""}
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <button
                onClick={() => void handleApproveAll()}
                disabled={saving || approvedCount === 0}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "Saving..." : "Approve All"}
              </button>
            </div>
          </div>
        )}
      </div>
    </SentryErrorBoundary>
  );
}
