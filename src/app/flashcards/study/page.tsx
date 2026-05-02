"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import PageIntro from "@/components/PageIntro";
import { flashcardsFetch } from "@/lib/flashcardApi";
import { supabase } from "@/lib/supabase";

function FlashcardStudyIntro() {
  return (
    <section className="shrink-0 border-b border-gray-200 bg-[#F9FAFB]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/flashcards" className="text-sm font-semibold text-brand-teal hover:underline">
          ← Back to Flashcards
        </Link>
        <PageIntro
          subtitle="STUDY SESSION"
          title="Flashcard Review"
          description="Rate each card honestly — Know it, Unsure, or No idea. The platform uses spaced repetition to show you cards at the perfect time for long-term memory."
          tip="Be honest with yourself. Marking 'Know it' when you are unsure defeats the purpose. The algorithm needs accurate ratings to help you."
        />
      </div>
    </section>
  );
}

type Flashcard = {
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
  const params = useSearchParams();
  const source = params.get("source");

  const [userId, setUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressPeek>>({});
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [complete, setComplete] = useState(false);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionReview, setSessionReview] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (!user) router.replace("/login");
    });
  }, [router]);

  const loadDeck = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const nowIso = new Date().toISOString();

    if (source === "bank") {
      const [{ data: saves }, { data: custom }] = await Promise.all([
        supabase.from("flashcard_saves").select("flashcard_id").eq("user_id", userId),
        supabase.from("flashcards").select("id").eq("created_by", userId).eq("is_platform", false),
      ]);
      const ids = new Set<string>();
      (saves ?? []).forEach((r: { flashcard_id: string }) => ids.add(r.flashcard_id));
      (custom ?? []).forEach((r: { id: string }) => ids.add(r.id));
      const idList = [...ids];
      if (!idList.length) {
        setDeck([]);
        setLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from("flashcards")
        .select("id, front, back, hint, command_word")
        .in("id", idList)
        .order("chapter");
      setDeck((rows ?? []) as Flashcard[]);
    } else {
      const { data: due } = await supabase
        .from("flashcard_progress")
        .select("flashcard_id, times_seen, times_correct, status, next_review_at")
        .eq("student_id", userId)
        .lte("next_review_at", nowIso);

      const idList = (due ?? []).map((r: { flashcard_id: string }) => r.flashcard_id);
      const prog: Record<string, ProgressPeek> = {};
      for (const r of due ?? []) {
        const row = r as ProgressPeek & { flashcard_id: string };
        prog[row.flashcard_id] = {
          times_seen: row.times_seen,
          times_correct: row.times_correct,
          status: row.status,
          next_review_at: row.next_review_at,
        };
      }
      setProgressMap(prog);

      if (!idList.length) {
        setDeck([]);
        setLoading(false);
        return;
      }

      const { data: rows } = await supabase
        .from("flashcards")
        .select("id, front, back, hint, command_word")
        .in("id", idList);
      setDeck((rows ?? []) as Flashcard[]);
    }

    setLoading(false);
    setIdx(0);
    setFlipped(false);
    setComplete(false);
    setSessionKnown(0);
    setSessionReview(0);
  }, [userId, source]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  useEffect(() => {
    const hydrateProgress = async () => {
      if (!userId || deck.length === 0 || source === "bank") return;
      const { data } = await supabase
        .from("flashcard_progress")
        .select("flashcard_id, times_seen, times_correct, status, next_review_at")
        .eq("student_id", userId)
        .in(
          "flashcard_id",
          deck.map((c) => c.id)
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
    void hydrateProgress();
  }, [userId, deck, source]);

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

      if (res.ok) {
        setProgressMap((m) => ({
          ...m,
          [card.id]: { times_seen: seen, times_correct: correct, status, next_review_at: next.toISOString() },
        }));
        if (rating === "know_it") setSessionKnown((n) => n + 1);
        else setSessionReview((n) => n + 1);

        if (idx + 1 >= deck.length) {
          setComplete(true);
        } else {
          setIdx((i) => i + 1);
          setFlipped(false);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!userId) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <FlashcardStudyIntro />
        <div className="body-font flex flex-1 items-center justify-center bg-slate-900 px-4 py-16 text-white">
          Loading…
        </div>
      </div>
    );
  }

  if (deck.length === 0 && !complete) {
    return (
      <div className="flex min-h-screen flex-col">
        <FlashcardStudyIntro />
        <div className="body-font flex flex-1 flex-col items-center justify-center bg-slate-900 px-4 py-16 text-center text-white">
          <p className="text-lg">No cards in this session.</p>
          <p className="mt-2 text-sm text-slate-300">
            {source === "bank"
              ? "Save cards to your bank or create your own."
              : "Nothing is due right now. Check back later or study from your bank."}
          </p>
          <Link href="/flashcards" className="mt-6 font-semibold text-brand-teal hover:underline">
            ← Back to Flashcards
          </Link>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex min-h-screen flex-col">
        <FlashcardStudyIntro />
        <div className="body-font flex flex-1 flex-col items-center justify-center bg-slate-900 px-4 py-16 text-center text-white">
          <h1 className="heading-font text-2xl font-bold text-white">Session complete!</h1>
          <p className="mt-4 text-lg text-slate-200">
            {sessionKnown} known, {sessionReview} to review
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/flashcards"
              className="rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white hover:bg-brand-teal-dark"
            >
              Flashcards home
            </Link>
            {source === "bank" ? (
              <Link href="/flashcards/my-bank" className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold hover:bg-white/10">
                My bank
              </Link>
            ) : (
              <Link href="/flashcards/study?source=bank" className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold hover:bg-white/10">
                Study my bank
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const progressPct = deck.length ? Math.round(((idx + (flipped ? 0.5 : 0)) / deck.length) * 100) : 0;

  return (
    <div className="body-font flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <FlashcardStudyIntro />
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <Link href="/flashcards" className="text-sm font-semibold text-teal-300 hover:text-white">
          ← Flashcards
        </Link>
        <div className="h-2 w-40 max-w-[50vw] overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-teal transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          {idx + 1} / {deck.length}
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-6">
        <p className="mb-4 text-sm text-slate-400">
          Card {idx + 1} of {deck.length}
        </p>

        <button
          type="button"
          onClick={() => card && setFlipped((f) => !f)}
          className="relative min-h-[280px] w-full max-w-lg cursor-pointer rounded-3xl border-2 border-teal-500/40 bg-slate-800/80 p-8 text-center shadow-2xl transition hover:border-brand-teal"
        >
          {!flipped ? (
            <>
              {card?.command_word && (
                <span className="mb-4 inline-block rounded-full border border-brand-orange/50 bg-brand-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-orange">
                  {card.command_word}
                </span>
              )}
              <p className="text-lg font-medium leading-relaxed text-white">{card?.front}</p>
              <p className="mt-6 text-sm italic text-slate-500">Tap to flip</p>
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed text-slate-100 whitespace-pre-line">{card?.back}</p>
              {card?.hint && <p className="mt-6 text-sm italic text-slate-500">{card.hint}</p>}
            </>
          )}
        </button>

        {flipped && (
          <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitRating("no_idea")}
              className="rounded-xl bg-red-950/80 py-3 text-sm font-bold text-red-200 ring-1 ring-red-500/40 hover:bg-red-900/80 disabled:opacity-50"
            >
              🔴 No idea (10 min)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitRating("unsure")}
              className="rounded-xl bg-amber-950/80 py-3 text-sm font-bold text-amber-100 ring-1 ring-amber-500/40 hover:bg-amber-900/80 disabled:opacity-50"
            >
              🟡 Unsure (tomorrow)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitRating("know_it")}
              className="rounded-xl bg-emerald-950/80 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-500/40 hover:bg-emerald-900/80 disabled:opacity-50"
            >
              🟢 Know it! (7 days)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FlashcardsStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="body-font flex min-h-screen items-center justify-center bg-slate-900 text-white">Loading…</div>
      }
    >
      <StudyInner />
    </Suspense>
  );
}
