"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { flashcardsFetch } from "@/lib/flashcardApi";
import { FLASHCARD_STUDY_SESSION_IDS_KEY } from "@/lib/flashcardStudySession";
import { supabase } from "@/lib/supabase";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type DeckCard = {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  command_word: string | null;
};

type ProgressPeek = {
  times_seen: number;
  times_correct: number;
  status?: string | null;
  next_review_at?: string | null;
};

function StudyInner() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressPeek>>({});
  const [loading, setLoading] = useState(true);
  const [deckSource, setDeckSource] = useState<"session" | "bank">("bank");

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  const [sessionKnow, setSessionKnow] = useState(0);
  const [sessionUnsure, setSessionUnsure] = useState(0);
  const [sessionNoIdea, setSessionNoIdea] = useState(0);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (!user) router.replace("/login");
    });
  }, [router]);

  const loadDeck = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let source: "session" | "bank" = "bank";
    let idOrder: string[] = [];

    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(FLASHCARD_STUDY_SESSION_IDS_KEY) : null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            idOrder = [...new Set(parsed.map(String).filter(Boolean))];
          }
        } catch {
          idOrder = [];
        }
        sessionStorage.removeItem(FLASHCARD_STUDY_SESSION_IDS_KEY);
      }
    } catch {
      /* ignore */
    }

    if (idOrder.length > 0) {
      source = "session";
      const { data: rows } = await supabase.from("flashcards").select("id, front, back, hint, command_word").in("id", idOrder);
      const list = rows as DeckCard[] | null;
      const map = new Map((list ?? []).map((r) => [r.id, r]));
      const ordered = idOrder.map((id) => map.get(id)).filter(Boolean) as DeckCard[];
      setDeck(ordered);
    } else {
      source = "bank";
      const [{ data: saves }, { data: custom }] = await Promise.all([
        supabase.from("flashcard_saves").select("flashcard_id").eq("user_id", userId),
        supabase.from("flashcards").select("id").eq("created_by", userId).eq("is_platform", false),
      ]);
      const ids = new Set<string>();
      (saves ?? []).forEach((r: { flashcard_id: string }) => ids.add(r.flashcard_id));
      (custom ?? []).forEach((r: { id: string }) => ids.add(r.id));
      const idList = [...ids];
      if (idList.length === 0) {
        setDeck([]);
        setDeckSource(source);
        setLoading(false);
        setIdx(0);
        setFlipped(false);
        setComplete(false);
        setSessionKnow(0);
        setSessionUnsure(0);
        setSessionNoIdea(0);
        return;
      }
      const { data: rows } = await supabase
        .from("flashcards")
        .select("id, front, back, hint, command_word")
        .in("id", idList)
        .order("chapter", { ascending: true });
      setDeck((rows ?? []) as DeckCard[]);
    }

    setDeckSource(source);
    setLoading(false);
    setIdx(0);
    setFlipped(false);
    setComplete(false);
    setSessionKnow(0);
    setSessionUnsure(0);
    setSessionNoIdea(0);
  }, [userId]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  /** Progress rows for graded cards only (helps existing progress merge). */
  useEffect(() => {
    const sync = async () => {
      if (!userId || deck.length === 0) return;
      const { data } = await supabase
        .from("flashcard_progress")
        .select("flashcard_id, times_seen, times_correct, status, next_review_at")
        .eq("student_id", userId)
        .in(
          "flashcard_id",
          deck.map((c) => c.id),
        );
      const map: Record<string, ProgressPeek> = {};
      for (const r of data ?? []) {
        const row = r as ProgressPeek & { flashcard_id: string };
        map[row.flashcard_id] = {
          times_seen: row.times_seen,
          times_correct: row.times_correct,
          status: row.status,
          next_review_at: row.next_review_at,
        };
      }
      setProgressMap(map);
    };
    void sync();
  }, [userId, deck]);

  const card = deck[idx];

  const submitRating = async (rating: "no_idea" | "unsure" | "know_it") => {
    if (!card || !userId || busy) return;
    setBusy(true);
    try {
      const prev = progressMap[card.id];
      const seen = (prev?.times_seen ?? 0) + 1;
      let correct = prev?.times_correct ?? 0;
      if (rating === "know_it") correct += 1;

      const next = new Date();
      let status = "struggling";
      if (rating === "know_it") {
        status = "known";
        next.setDate(next.getDate() + 7);
      } else if (rating === "unsure") {
        status = "unsure";
        next.setDate(next.getDate() + 1);
      } else {
        status = "struggling";
        next.setMinutes(next.getMinutes() + 10);
      }

      const res = await flashcardsFetch("/api/flashcards/progress", {
        method: "POST",
        body: JSON.stringify({
          flashcard_id: card.id,
          status,
          next_review_at: next.toISOString(),
          times_seen: seen,
          times_correct: correct,
        }),
      });

      if (!res.ok) return;

      setProgressMap((m) => ({
        ...m,
        [card.id]: { times_seen: seen, times_correct: correct, status, next_review_at: next.toISOString() },
      }));

      if (rating === "know_it") setSessionKnow((n) => n + 1);
      else if (rating === "unsure") setSessionUnsure((n) => n + 1);
      else setSessionNoIdea((n) => n + 1);

      await delay(500);

      if (idx + 1 >= deck.length) {
        setComplete(true);
      } else {
        setIdx((i) => i + 1);
        setFlipped(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const restartSession = () => {
    setIdx(0);
    setFlipped(false);
    setComplete(false);
    setSessionKnow(0);
    setSessionUnsure(0);
    setSessionNoIdea(0);
  };

  if (!userId) return null;

  const progressPct =
    deck.length > 0 ? Math.min(100, Math.round(((idx + (flipped ? 0.5 : 0)) / deck.length) * 100)) : 0;

  const summary = (
    <div className="body-font mx-auto mt-8 max-w-md space-y-2 rounded-2xl border border-teal-100 bg-white px-6 py-5 text-left text-[15px] text-slate-700 shadow-card">
      <p>
        <span className="font-semibold text-emerald-700">Know:</span> {sessionKnow}
      </p>
      <p>
        <span className="font-semibold text-amber-700">Unsure:</span> {sessionUnsure}
      </p>
      <p>
        <span className="font-semibold text-red-700">No idea:</span> {sessionNoIdea}
      </p>
      <p className="pt-2 text-sm text-slate-500">{deckSource === "session" ? "Session deck (due or hub)." : "Your full bank deck."}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E8F4F2] text-slate-700">
        <p className="body-font font-medium">Loading your session…</p>
      </div>
    );
  }

  if (deck.length === 0 && !complete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E8F4F2] px-4 py-16 text-center">
        <p className="heading-font text-xl font-bold text-slate-900">No cards here yet</p>
        <p className="body-font mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-slate-600">
          Nothing in this deck. Save platform cards from Browse, create your own from My bank, or come back when cards are due.
        </p>
        <Link
          href="/flashcards"
          className="mt-8 rounded-xl bg-brand-teal px-8 py-3 text-sm font-bold text-white hover:bg-brand-teal-dark"
        >
          Back to hub
        </Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E8F4F2] px-4 py-16 text-center">
        <h1 className="heading-font text-2xl font-bold text-[#111827]">Nice work!</h1>
        <p className="body-font mx-auto mt-2 max-w-md text-[15px] text-slate-600">Here’s how you rated this session:</p>
        {summary}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={restartSession}
            className="rounded-xl bg-brand-teal px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-teal-dark"
          >
            Study again
          </button>
          <Link
            href="/flashcards"
            className="inline-flex rounded-xl border-2 border-brand-teal bg-white px-8 py-3 text-sm font-bold text-brand-teal hover:bg-teal-50"
          >
            Back to hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#E8F4F2] pb-28">
      <header className="sticky top-0 z-10 border-b border-teal-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <Link href="/flashcards" className="body-font shrink-0 text-sm font-semibold text-brand-teal hover:underline">
            Exit
          </Link>
          <div className="min-w-0 flex-1">
            <p className="body-font text-center text-sm font-semibold text-slate-700">
              Card {idx + 1} of {deck.length}
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-teal-100">
              <div
                className="h-full rounded-full bg-brand-teal transition-[width] duration-300"
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>
          <span className="heading-font shrink-0 text-sm tabular-nums text-brand-teal">
            {Math.round(progressPct)}%
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-8">
        <div className="mx-auto w-full" style={{ perspective: "1400px" }}>
          <div
            role="presentation"
            onClick={() => {
              if (!flipped && !busy) setFlipped(true);
            }}
            className={clsx(
              "relative mx-auto mb-10 min-h-64 w-full max-w-xl cursor-pointer transition-transform duration-700 ease-out",
              flipped && "cursor-default pointer-events-none",
              busy && "pointer-events-none opacity-80",
            )}
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className="absolute inset-0 flex min-h-[16rem] flex-col rounded-2xl bg-white p-6 shadow-lg"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
              }}
            >
              <div className="flex shrink-0 justify-start">
                {card?.command_word && (
                  <span className="inline-block rounded-full border border-brand-orange/40 bg-orange-50 px-3 py-1 text-xs font-bold text-brand-orange">
                    {card.command_word}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                <p className="heading-font text-xl font-bold leading-snug text-[#111827]">{card?.front}</p>
              </div>
              <p className="body-font shrink-0 text-center text-sm text-slate-500">Tap to reveal answer</p>
            </div>

            <div
              className="absolute inset-0 flex min-h-[16rem] flex-col rounded-2xl bg-white p-6 shadow-lg"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-brand-teal">ANSWER</p>
              <div className="body-font flex-1 overflow-auto text-[16px] leading-relaxed text-slate-800">
                <p className="whitespace-pre-wrap text-left">{card?.back}</p>
                {card?.hint ? (
                  <p className="body-font mt-4 border-t border-slate-100 pt-4 text-left text-sm italic text-slate-500">
                    {card.hint}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl space-y-3">
          {flipped && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitRating("no_idea")}
                className="body-font flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-4 text-[15px] font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                🔴 No idea
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitRating("unsure")}
                className="body-font flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-4 text-[15px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                🟡 Unsure
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitRating("know_it")}
                className="body-font flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal py-4 text-[15px] font-bold text-white hover:bg-brand-teal-dark disabled:opacity-50"
              >
                🟢 Know it!
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function FlashcardsStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#E8F4F2] text-slate-700">Loading…</div>
      }
    >
      <StudyInner />
    </Suspense>
  );
}
