"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import FlashcardLibraryTile from "@/components/flashcards/FlashcardLibraryTile";
import type { FlashcardRow } from "@/components/flashcards/FlashcardTile";
import PageIntro from "@/components/PageIntro";
import { flashcardsFetch } from "@/lib/flashcardApi";
import { FLASHCARD_BROWSE_TOPICS } from "@/lib/flashcardBrowseTopics";
import { FLASHCARD_STUDY_SESSION_IDS_KEY } from "@/lib/flashcardStudySession";
import { supabase } from "@/lib/supabase";

type Tab = "saved" | "custom";

export default function FlashcardsMyBankPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [tab, setTab] = useState<Tab>("saved");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const [savedCards, setSavedCards] = useState<FlashcardRow[]>([]);
  const [customCards, setCustomCards] = useState<FlashcardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);

  const [savedStat, setSavedStat] = useState(0);
  const [customStat, setCustomStat] = useState(0);
  const [masteredStat, setMasteredStat] = useState(0);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setHydrated(true);
    });
  }, []);

  const loadBank = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [savesRes, customRes, masteredRes] = await Promise.all([
        supabase.from("flashcard_saves").select("flashcard_id").eq("user_id", uid),
        supabase
          .from("flashcards")
          .select("id, chapter, subtopic, front, back, hint, command_word, tier, created_by, is_platform, subject")
          .eq("created_by", uid)
          .eq("is_platform", false)
          .order("chapter", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("flashcard_progress")
          .select("*", { count: "exact", head: true })
          .eq("student_id", uid)
          .eq("status", "known"),
      ]);

      setSavedStat((savesRes.data ?? []).length);
      setCustomStat((customRes.data ?? []).length);
      setMasteredStat(masteredRes.count ?? 0);

      const saveIds = (savesRes.data ?? []).map((r) => r.flashcard_id as string);
      if (saveIds.length === 0) {
        setSavedCards([]);
      } else {
        const { data: savedRows, error: saveErr } = await supabase
          .from("flashcards")
          .select("id, chapter, subtopic, front, back, hint, command_word, tier, created_by, is_platform, subject")
          .in("id", saveIds)
          .order("chapter", { ascending: true })
          .order("id", { ascending: true });
        if (saveErr) throw new Error(saveErr.message);
        setSavedCards((savedRows ?? []) as FlashcardRow[]);
      }

      if (customRes.error) throw new Error(customRes.error.message);
      setCustomCards((customRes.data ?? []) as FlashcardRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bank.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void loadBank(userId);
  }, [userId, loadBank]);

  const activeList = tab === "saved" ? savedCards : customCards;

  const filteredList = useMemo(() => {
    if (!topicFilter) return activeList;
    return activeList.filter((c) => c.chapter === topicFilter);
  }, [activeList, topicFilter]);

  const toggleTopic = (t: string) => {
    setTopicFilter((prev) => (prev === t ? null : t));
  };

  const goStudyBank = () => {
    try {
      sessionStorage.removeItem(FLASHCARD_STUDY_SESSION_IDS_KEY);
    } catch {
      /* ignore */
    }
    router.push("/flashcards/study");
  };

  const handleRemove = async (card: FlashcardRow) => {
    if (!userId) return;
    setRemoveBusyId(card.id);
    try {
      if (tab === "saved") {
        const res = await flashcardsFetch(`/api/flashcards/save?flashcard_id=${encodeURIComponent(card.id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setSavedCards((prev) => prev.filter((c) => c.id !== card.id));
          setSavedStat((n) => Math.max(0, n - 1));
        }
      } else {
        const res = await flashcardsFetch(`/api/flashcards/custom?id=${encodeURIComponent(card.id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setCustomCards((prev) => prev.filter((c) => c.id !== card.id));
          setCustomStat((n) => Math.max(0, n - 1));
        }
      }
    } finally {
      setRemoveBusyId(null);
    }
  };

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
        <p className="text-sm text-slate-600">Loading…</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
        <PageIntro
          subtitle="MY SAVED CARDS"
          title="My Flashcard Bank"
          description="Your personal collection of saved and custom flashcards. Study these regularly — they are the concepts YOU found hardest and need the most practice on."
          tip="Add cards when you get a question wrong in practice. Your bank becomes your personal weak-area revision tool."
        />
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <p className="body-font text-[15px] leading-relaxed text-slate-700">
            <Link href="/login" className="font-semibold text-brand-teal underline underline-offset-2">
              Sign in
            </Link>{" "}
            to view your saved platform cards and custom flashcards.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <Link href="/flashcards" className="inline-block text-sm font-semibold text-brand-teal hover:underline">
        ← Flashcards hub
      </Link>
      <PageIntro
        subtitle="MY SAVED CARDS"
        title="My Flashcard Bank"
        description="Your personal collection of saved and custom flashcards. Study these regularly — they are the concepts YOU found hardest and need the most practice on."
        tip="Add cards when you get a question wrong in practice. Your bank becomes your personal weak-area revision tool."
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="heading-font text-2xl font-bold text-brand-teal">{savedStat}</p>
          <p className="body-font mt-1 text-[13px] text-slate-600">Saved</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="heading-font text-2xl font-bold text-brand-orange">{customStat}</p>
          <p className="body-font mt-1 text-[13px] text-slate-600">Custom</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="heading-font text-2xl font-bold text-brand-teal">{masteredStat}</p>
          <p className="body-font mt-1 text-[13px] text-slate-600">Mastered</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={goStudyBank}
          className="inline-flex items-center justify-center rounded-xl bg-brand-teal px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
        >
          Study these cards →
        </button>
        <Link
          href="/flashcards/print"
          className="inline-flex items-center justify-center rounded-xl border-2 border-brand-teal bg-white px-6 py-3 text-sm font-bold text-brand-teal transition hover:bg-teal-50"
        >
          Print →
        </Link>
      </div>

      <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2">
        {(
          [
            ["saved", "Saved"],
            ["custom", "My custom cards"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setTopicFilter(null);
            }}
            className={`rounded-t-lg px-4 py-2 text-sm font-bold transition ${
              tab === key ? "border-b-2 border-brand-teal text-brand-teal" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FLASHCARD_BROWSE_TOPICS.map((topic) => {
          const active = topicFilter === topic;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggleTopic(topic)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                active
                  ? "border-brand-teal bg-brand-teal text-white"
                  : "border-brand-teal/35 bg-teal-50 text-brand-teal hover:bg-brand-teal hover:text-white"
              }`}
            >
              {topic}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
      ) : loading ? (
        <p className="text-sm text-slate-600">Loading your bank…</p>
      ) : filteredList.length === 0 ? (
        <p className="rounded-2xl border border-teal-100 bg-white p-8 text-center text-sm text-slate-600">
          {tab === "saved"
            ? "No saved cards yet. Browse the library and tap the heart to save."
            : "No custom cards yet. Create one from Create a card."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredList.map((card) => (
            <FlashcardLibraryTile
              key={card.id}
              card={card}
              mode="bank"
              removeLoading={removeBusyId === card.id}
              onRemove={() => void handleRemove(card)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
