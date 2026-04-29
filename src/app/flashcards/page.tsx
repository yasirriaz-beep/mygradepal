"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Flashcard = {
  id: string;
  subject: string;
  chapter: string;
  subtopic: string | null;
  front: string;
  back: string;
  hint: string | null;
  command_word: string | null;
};

type ProgressRow = {
  flashcard_id: string;
  status: string;
  times_seen: number;
  times_correct: number;
  next_review_at: string;
};

type Mode = "quick" | "spaced" | "weak";

function FlashcardsContent() {
  const params = useSearchParams();
  const initialSubject = params.get("subject") ?? "Chemistry";
  const initialChapter = params.get("chapter") ?? "All";

  const [subject, setSubject] = useState(initialSubject);
  const [chapter, setChapter] = useState(initialChapter);
  const [mode, setMode] = useState<Mode>("quick");
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [progressByCard, setProgressByCard] = useState<Record<string, ProgressRow>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cardsAnswered, setCardsAnswered] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const hydrateUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setStudentId(user?.id ?? null);
    };
    void hydrateUser();
  }, []);

  useEffect(() => {
    const loadCards = async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id, subject, chapter, subtopic, front, back, hint, command_word")
        .eq("subject", subject)
        .order("chapter", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error) {
        setAllCards((data ?? []) as Flashcard[]);
      }
    };
    void loadCards();
  }, [subject]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!studentId || allCards.length === 0) {
        setProgressByCard({});
        return;
      }
      const ids = allCards.map((c) => c.id);
      const { data } = await supabase
        .from("flashcard_progress")
        .select("flashcard_id, status, times_seen, times_correct, next_review_at")
        .eq("student_id", studentId)
        .in("flashcard_id", ids);
      const map: Record<string, ProgressRow> = {};
      (data ?? []).forEach((row) => {
        map[(row as ProgressRow).flashcard_id] = row as ProgressRow;
      });
      setProgressByCard(map);
    };
    void loadProgress();
  }, [studentId, allCards]);

  const chapters = useMemo(() => ["All", ...Array.from(new Set(allCards.map((c) => c.chapter)))], [allCards]);

  useEffect(() => {
    const now = Date.now();
    let filtered = allCards.filter((c) => chapter === "All" || c.chapter === chapter);

    if (mode === "spaced") {
      filtered = filtered.filter((c) => {
        const p = progressByCard[c.id];
        if (!p) return true;
        return new Date(p.next_review_at).getTime() <= now;
      });
    } else if (mode === "weak") {
      filtered = filtered.filter((c) => {
        const p = progressByCard[c.id];
        if (!p) return true;
        return p.status === "struggling" || p.status === "unsure";
      });
    }

    setDeck(filtered);
    setCurrentIndex(0);
    setFlipped(false);
    setCardsAnswered(0);
    setKnownCount(0);
  }, [allCards, chapter, mode, progressByCard]);

  const card = deck[currentIndex];

  const saveProgress = async (flashcardId: string, response: "know_it" | "unsure" | "no_idea") => {
    if (!studentId) return;
    const existing = progressByCard[flashcardId];
    const seen = (existing?.times_seen ?? 0) + 1;
    const correct = (existing?.times_correct ?? 0) + (response === "know_it" ? 1 : 0);

    const nextReview = new Date();
    let status = "unseen";
    if (response === "know_it") {
      status = "known";
      nextReview.setDate(nextReview.getDate() + 7);
    } else if (response === "unsure") {
      status = "unsure";
      nextReview.setDate(nextReview.getDate() + 1);
    } else {
      status = "struggling";
      nextReview.setMinutes(nextReview.getMinutes() + 10);
    }

    const row = {
      student_id: studentId,
      flashcard_id: flashcardId,
      status,
      times_seen: seen,
      times_correct: correct,
      next_review_at: nextReview.toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    await supabase.from("flashcard_progress").upsert(row, { onConflict: "student_id,flashcard_id" });
    setProgressByCard((prev) => ({
      ...prev,
      [flashcardId]: {
        flashcard_id: flashcardId,
        status,
        times_seen: seen,
        times_correct: correct,
        next_review_at: row.next_review_at,
      },
    }));
  };

  const handleResponse = async (response: "no_idea" | "unsure" | "know_it") => {
    if (!card) return;
    await saveProgress(card.id, response);
    setCardsAnswered((x) => x + 1);
    if (response === "know_it") setKnownCount((x) => x + 1);

    if (response === "no_idea") {
      setDeck((prev) => {
        if (prev.length <= 1) return prev;
        const next = [...prev];
        const [first] = next.splice(currentIndex, 1);
        next.push(first);
        return next;
      });
      setFlipped(false);
      if (currentIndex >= deck.length - 1) setCurrentIndex(0);
      return;
    }

    setFlipped(false);
    setCurrentIndex((idx) => (idx + 1 >= deck.length ? 0 : idx + 1));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "20px 14px 30px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 24, margin: 0, color: "#111827" }}>Flashcards</h1>
          <Link href="/dashboard" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Dashboard</Link>
        </div>

        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>
          {cardsAnswered} / {deck.length} cards · {knownCount} known
        </p>
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999, marginBottom: 16 }}>
          <div style={{ height: 6, borderRadius: 999, background: "#1D9E75", width: `${deck.length === 0 ? 0 : Math.min(100, Math.round((cardsAnswered / deck.length) * 100))}%` }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ padding: "10px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <option>Chemistry</option>
          </select>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} style={{ padding: "10px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            {chapters.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/flashcards/print"
            style={{
              display: "inline-block",
              background: "#1D9E75",
              color: "white",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🖨 Print flashcards
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { key: "quick" as const, label: "Quick Review" },
            { key: "spaced" as const, label: "Spaced Repetition" },
            { key: "weak" as const, label: "Weak Spots" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: "10px 8px",
                borderRadius: 10,
                border: `1.5px solid ${mode === m.key ? "#1D9E75" : "#e5e7eb"}`,
                background: mode === m.key ? "#E1F5EE" : "white",
                color: mode === m.key ? "#085041" : "#4b5563",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 12 }}>
          {deck.length === 0 ? "0 of 0 cards" : `${currentIndex + 1} of ${deck.length} cards`}
        </p>

        {card ? (
          <>
            <div
              onClick={() => setFlipped(!flipped)}
              style={{
                background: "white",
                borderRadius: 16,
                border: "1.5px solid #e5e7eb",
                padding: "2rem 1.5rem",
                minHeight: 220,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                position: "relative",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              {!flipped ? (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#1D9E75",
                    textTransform: "uppercase", letterSpacing: 1, margin: "0 0 16px" }}>
                    {card.command_word} ·  {card.subtopic}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 500, color: "#111827",
                    lineHeight: 1.5, margin: 0 }}>
                    {card.front}
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "16px 0 0" }}>
                    Tap to reveal answer
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#1D9E75",
                    textTransform: "uppercase", letterSpacing: 1, margin: "0 0 16px" }}>
                    Answer
                  </p>
                  <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7,
                    margin: "0 0 12px", whiteSpace: "pre-line" }}>
                    {card.back}
                  </p>
                  {card.hint && (
                    <p style={{ fontSize: 12, color: "#f5731e",
                      background: "#fff7ed", borderRadius: 8,
                      padding: "6px 12px", margin: "8px 0 0" }}>
                      💡 {card.hint}
                    </p>
                  )}
                </>
              )}
            </div>

            {flipped && (
              <div style={{ display: "flex", gap: 10, marginTop: 16, maxWidth: 480, margin: "16px auto 0" }}>
                <button onClick={() => void handleResponse("no_idea")}
                  style={{ flex: 1, padding: "10px", borderRadius: 10,
                    background: "#FCEBEB", color: "#791F1F", border: "none",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit" }}>
                  No idea
                </button>
                <button onClick={() => void handleResponse("unsure")}
                  style={{ flex: 1, padding: "10px", borderRadius: 10,
                    background: "#FAEEDA", color: "#633806", border: "none",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit" }}>
                  Unsure
                </button>
                <button onClick={() => void handleResponse("know_it")}
                  style={{ flex: 1, padding: "10px", borderRadius: 10,
                    background: "#E1F5EE", color: "#085041", border: "none",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit" }}>
                  Know it!
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: "2rem", textAlign: "center", color: "#6b7280" }}>
            No flashcards found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <p style={{ color: "#6b7280" }}>Loading flashcards...</p>
      </div>
    }>
      <FlashcardsContent />
    </Suspense>
  );
}
