"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import FlashcardLibraryTile from "@/components/flashcards/FlashcardLibraryTile";
import type { FlashcardRow } from "@/components/flashcards/FlashcardTile";
import PageIntro from "@/components/PageIntro";
import { flashcardsFetch } from "@/lib/flashcardApi";
import { chapterDbValuesForTopicChip, FLASHCARD_BROWSE_TOPICS } from "@/lib/flashcardBrowseTopics";
import { FLASHCARD_STUDY_SESSION_IDS_KEY } from "@/lib/flashcardStudySession";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;
const SUBJECT = "Chemistry";

function sanitizeSearchIlike(term: string): string {
  return term.trim().replace(/[%_,()'"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default function FlashcardsBrowsePage() {
  const router = useRouter();
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [cards, setCards] = useState<FlashcardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null);
  const [topicStudyCount, setTopicStudyCount] = useState<number | null>(null);
  const [topicStudyBusy, setTopicStudyBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(sanitizeSearchIlike(searchInput)), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const reloadSavedIds = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from("flashcard_saves").select("flashcard_id").eq("user_id", uid);
    if (error) return;
    setSavedIds(new Set((data ?? []).map((r) => r.flashcard_id as string)));
  }, []);

  useEffect(() => {
    if (userId) void reloadSavedIds(userId);
    else setSavedIds(new Set());
  }, [userId, reloadSavedIds]);

  useEffect(() => {
    if (!topicFilter) {
      setTopicStudyCount(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const chs = chapterDbValuesForTopicChip(topicFilter);
      let qc = supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("is_platform", true)
        .eq("subject", SUBJECT);
      qc = chs.length === 1 ? qc.eq("chapter", chs[0]!) : qc.in("chapter", chs);

      const { count, error } = await qc;
      if (cancelled) return;
      if (error) {
        setTopicStudyCount(null);
        return;
      }
      setTopicStudyCount(count ?? 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [topicFilter]);

  const buildBaseQuery = useCallback(() => {
    let q = supabase
      .from("flashcards")
      .select("id, chapter, subtopic, front, back, hint, command_word, tier, created_by, is_platform, subject")
      .eq("is_platform", true)
      .eq("subject", SUBJECT)
      .order("chapter", { ascending: true })
      .order("id", { ascending: true });

    if (topicFilter) {
      const chs = chapterDbValuesForTopicChip(topicFilter);
      q = chs.length === 1 ? q.eq("chapter", chs[0]!) : q.in("chapter", chs);
    }

    const term = debouncedSearch.trim();
    if (term.length > 0) {
      const pat = `%${term}%`;
      q = q.or(`front.ilike.${pat},back.ilike.${pat}`);
    }
    return q;
  }, [debouncedSearch, topicFilter]);

  const fetchPage = useCallback(
    async (from: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadError(null);
      }

      try {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await buildBaseQuery().range(from, to);

        if (error) {
          setLoadError(error.message);
          if (!append) setCards([]);
          setHasMore(false);
          return;
        }

        const rows = (data ?? []) as FlashcardRow[];
        setHasMore(rows.length === PAGE_SIZE);
        if (append) setCards((prev) => [...prev, ...rows]);
        else setCards(rows);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildBaseQuery],
  );

  useEffect(() => {
    void fetchPage(0, false);
  }, [fetchPage]);

  const toggleTopic = (t: string) => {
    setTopicFilter((prev) => (prev === t ? null : t));
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    void fetchPage(cards.length, true);
  };

  const onToggleSave = useCallback(
    async (flashcard_id: string) => {
      if (!userId) {
        router.push("/login");
        return;
      }
      const wasSaved = savedIds.has(flashcard_id);
      setSaveBusyId(flashcard_id);
      try {
        if (wasSaved) {
          const res = await flashcardsFetch(`/api/flashcards/save?flashcard_id=${encodeURIComponent(flashcard_id)}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setSavedIds((prev) => {
              const next = new Set(prev);
              next.delete(flashcard_id);
              return next;
            });
          }
        } else {
          const res = await flashcardsFetch("/api/flashcards/save", {
            method: "POST",
            body: JSON.stringify({ flashcard_id }),
          });
          if (res.ok) {
            setSavedIds((prev) => new Set(prev).add(flashcard_id));
          }
        }
      } finally {
        setSaveBusyId(null);
      }
    },
    [router, savedIds, userId],
  );

  const studyThisTopic = useCallback(async () => {
    if (!topicFilter) return;
    setTopicStudyBusy(true);
    try {
      const chs = chapterDbValuesForTopicChip(topicFilter);
      let q = supabase
        .from("flashcards")
        .select("id")
        .eq("is_platform", true)
        .eq("subject", SUBJECT)
        .order("id", { ascending: true });
      q = chs.length === 1 ? q.eq("chapter", chs[0]!) : q.in("chapter", chs);

      const { data, error } = await q;
      if (error) return;

      const ids = (data ?? []).map((r: { id: string }) => r.id).filter(Boolean);
      try {
        sessionStorage.setItem(FLASHCARD_STUDY_SESSION_IDS_KEY, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
      router.push("/flashcards/study");
    } finally {
      setTopicStudyBusy(false);
    }
  }, [router, topicFilter]);

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4">
        <Link href="/flashcards" className="inline-block text-sm font-semibold text-brand-teal hover:underline">
          ← Flashcards hub
        </Link>
        <PageIntro
          subtitle="BROWSE ALL CARDS"
          title="Platform Flashcard Library"
          description="829 expert-written flashcards covering all 12 Chemistry topics. Each card uses Cambridge exam command words and includes an Urdu memory hint. Save any card to your personal bank for focused review."
          tip="Filter by topic to focus on what you are studying this week."
        />

        <label className="mb-4 block">
          <span className="sr-only">Search flashcards</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search flashcards..."
            autoComplete="off"
            className="body-font w-full rounded-xl border border-teal-100 bg-white px-4 py-3 text-[15px] text-slate-900 shadow-sm outline-none ring-brand-teal/30 transition placeholder:text-slate-500 focus:ring-2"
          />
        </label>

        <div className="mb-6 flex flex-wrap gap-2">
          {FLASHCARD_BROWSE_TOPICS.map((topic) => {
            const active = topicFilter === topic;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-brand-teal bg-brand-teal text-white shadow-sm"
                    : "border-brand-teal/35 bg-teal-50 text-brand-teal hover:bg-brand-teal hover:text-white"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>

        {topicFilter ? (
          <div className="mb-8">
            <button
              type="button"
              disabled={topicStudyBusy || topicStudyCount === null || topicStudyCount === 0}
              onClick={() => void studyThisTopic()}
              className="inline-flex rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {topicStudyBusy
                ? "Preparing deck…"
                : `Study all ${topicStudyCount ?? "…"} cards from ${topicFilter} →`}
            </button>
          </div>
        ) : null}

        {!userId && (
          <p className="body-font mb-4 text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-brand-teal hover:underline">
              Sign in
            </Link>{" "}
            to save cards to your bank.
          </p>
        )}

        {loadError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>
        ) : loading ? (
          <p className="text-sm text-slate-600">Loading flashcards...</p>
        ) : cards.length === 0 ? (
          <p className="rounded-2xl border border-teal-100 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            No cards match these filters.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cards.map((card) => (
                <FlashcardLibraryTile
                  key={card.id}
                  card={card}
                  mode="browse"
                  expandablePreview
                  isSaved={savedIds.has(card.id)}
                  saveLoading={saveBusyId === card.id}
                  onToggleSave={() => onToggleSave(card.id)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={loadMore}
                  className="rounded-xl border-2 border-brand-teal bg-white px-8 py-3 text-sm font-bold text-brand-teal shadow-sm transition hover:bg-teal-50 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
