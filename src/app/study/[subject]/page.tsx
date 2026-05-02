"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const TEAL = "#1D9E75";
const TEAL_BORDER = TEAL;
const TEAL_BG = "#E1F5EE";

const PURPLE_BORDER = "#7F77DD";
const PURPLE_BG = "#EEEDFE";
const PURPLE_CHECK = "#6B61C6";

/** Syllabus paper codes — matches subject picker */
const SYLLABUS_CODES: Record<string, string> = {
  chemistry: "0620",
  physics: "0625",
  mathematics: "0580",
  biology: "0610",
  english: "0510",
  "pakistan studies": "0448",
  islamiyat: "0493",
  history: "0470",
  geography: "0460",
};

function titleCaseSubject(slug: string): string {
  const decoded = decodeURIComponent(slug.replace(/-/g, " "));
  return decoded
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function StudyTrackPage() {
  const params = useParams<{ subject?: string }>();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  const subjectSlug =
    typeof params.subject === "string" ? decodeURIComponent(params.subject).trim() : "";

  useEffect(() => {
    if (!subjectSlug) {
      router.replace("/subjects");
    }
  }, [subjectSlug, router]);

  const label = useMemo(() => titleCaseSubject(subjectSlug), [subjectSlug]);
  const syllabusCode = SYLLABUS_CODES[subjectSlug.toLowerCase()] ?? "0620";

  const showPastPapersSoon = useCallback(() => {
    setToast("Past paper prep is coming soon.");
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  if (!subjectSlug) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        fontFamily: "'DM Sans', sans-serif",
        padding: "24px 16px 40px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Link
          href="/subjects"
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 600,
            color: "#6b7280",
            textDecoration: "none",
            marginBottom: 20,
          }}
        >
          ← Subjects
        </Link>

        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: TEAL,
            margin: "0 0 10px",
          }}
        >
          {label} · IGCSE {syllabusCode}
        </p>
        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 8px",
            lineHeight: 1.25,
          }}
        >
          How do you want to study today?
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 15, color: "#6b7280", lineHeight: 1.5 }}>
          Pick a track — you can switch anytime
        </p>

        {/* Track 1 */}
        <div
          style={{
            background: TEAL_BG,
            borderRadius: 16,
            border: `1.5px solid ${TEAL_BORDER}`,
            padding: "22px 20px",
            marginBottom: 14,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Track 1
          </p>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>
            Learn
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151", lineHeight: 1.55 }}>
            Study chapter by chapter with your expert tutor. Best if you are building knowledge from scratch.
          </p>
          <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
            {[
              "12 chapters · subtopic by subtopic",
              "Expert tutor on every subtopic",
              "Video · Flashcards · Exam style questions",
              "Progress tracked chapter by chapter",
            ].map((line) => (
              <li key={line} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => router.push(`/learn/${encodeURIComponent(subjectSlug.toLowerCase())}`)}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              background: TEAL,
              border: "none",
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Start learning →
          </button>
        </div>

        {/* Track 2 */}
        <div
          style={{
            background: PURPLE_BG,
            borderRadius: 16,
            border: `1.5px solid ${PURPLE_BORDER}`,
            padding: "22px 20px",
            marginBottom: 22,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: PURPLE_BORDER, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Track 2
          </p>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>
            Past paper prep
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151", lineHeight: 1.55 }}>
            Practice with real Cambridge papers. Best if you have studied the content and want to sharpen exam technique.
          </p>
          <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
            {[
              "Papers from 2019 to 2025",
              "Smart predict — likely exam topics",
              "Expert mark scheme review per question",
              "Tutor help on any question",
            ].map((line) => (
              <li key={line} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                <span style={{ color: PURPLE_CHECK, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={showPastPapersSoon}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              background: PURPLE_BORDER,
              border: "none",
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Start past paper prep →
          </button>
        </div>

        <div
          onClick={() => router.push(`/flashcards`)}
          style={{
            background: "white",
            border: "2px solid #F59E0B",
            borderRadius: 16,
            padding: "1.5rem",
            cursor: "pointer",
            transition: "all 0.15s",
            marginTop: 12,
            marginBottom: 22,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "#FFFBEB";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "white";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#B45309",
              textTransform: "uppercase",
              letterSpacing: 1,
              margin: "0 0 8px",
            }}
          >
            Quick Revision
          </p>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#1C1C1E", margin: "0 0 8px" }}>
            🃏 Flashcards
          </p>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            60 hand-crafted cards across all 12 chapters. Tap to flip. Track what you know.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#F59E0B",
              color: "white",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Start revision →
          </div>
        </div>

        {/* Tip */}
        <div
          style={{
            background: "#FFFBEB",
            borderRadius: 14,
            border: "1px solid #FBBF24",
            padding: "14px 16px",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.65 }}>
            <strong style={{ color: "#92400e" }}>Not sure which to pick?</strong> If your exam is more than 6 weeks away, start
            with Learn. If it is under 6 weeks, go straight to past papers.
          </p>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 28,
            transform: "translateX(-50%)",
            background: "#1f2937",
            color: "white",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            zIndex: 100,
            maxWidth: "min(440px, calc(100vw - 32px))",
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
