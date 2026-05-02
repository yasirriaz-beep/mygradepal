"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import FlashcardTile, { type FlashcardRow } from "@/components/flashcards/FlashcardTile";
import PageIntro from "@/components/PageIntro";
import { flashcardsFetch } from "@/lib/flashcardApi";
import { FLASHCARD_BROWSE_TOPICS } from "@/lib/flashcardBrowseTopics";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

function sanitizeSearchIlike(term: string): string {
  return term.trim().replace(/[%_,()'"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function buildBrowseHref(topic: string | null, page: number): string {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return q ? `/flashcards/browse?${q}` : "/flashcards/browse";
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const topicFromUrl =
    searchParams.get("topic")?.trim() || searchParams.get("chapter")?.trim() || null;
  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cards, setCards] = useState<FlashcardRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(sanitizeSearchIlike(searchInput)), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  /** When searching, reset URL to page 1 (avoid stale page). */
  useEffect(() => {
    if (!debouncedSearch || pageFromUrl <= 1) return;
    const params = new URLSearchParams();
    if (topicFromUrl) params.set("topic", topicFromUrl);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pageFromUrl, pathname, router, topicFromUrl]);

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

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const fromRow = (pageFromUrl - 1) * PAGE_SIZE;
    const toRow = fromRow + PAGE_SIZE - 1;

    try {
      let q = supabase
        .from("flashcards")
        .select("id, chapter, subtopic, front, back, hint, command_word, tier, created_by, is_platform", {
          count: "exact",
        })
        .eq("is_platform", true);

      if (topicFromUrl) q = q.eq("chapter", topicFromUrl);

      const term = debouncedSearch.trim();
      if (term.length > 0) {
        const pat = `%${term}%`;
        q = q.or(`front.ilike.${pat},back.ilike.${pat}`);
      }

      q = q.order("chapter", { ascending: true }).order("id", { ascending: true }).range(fromRow, toRow);

      const { data, error, count } = await q;

      if (error) {
        setLoadError(error.message);
        setCards([]);
        setTotalCount(0);
      } else {
        setCards((data ?? []) as FlashcardRow[]);
        setTotalCount(count ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageFromUrl, topicFromUrl]);

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activePage = Math.min(pageFromUrl, totalPages);

  const paginationInvalid = activePage !== pageFromUrl && totalCount > 0;

  /** If user lands on page > last page after filter, clamp. */
  useEffect(() => {
    if (!paginationInvalid || loading) return;
    router.replace(buildBrowseHref(topicFromUrl, activePage));
  }, [paginationInvalid, activePage, router, topicFromUrl, loading]);

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

  const topicSidebar = useMemo(
    () =>
      FLASHCARD_BROWSE_TOPICS.map((t) => ({
        slug: t,
        href: buildBrowseHref(t, 1),
        active: topicFromUrl === t,
      })),
    [topicFromUrl],
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-8">
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <Link href="/flashcards" className="inline-block text-sm font-semibold text-brand-teal hover:underline">
          ← Flashcards hub
        </Link>
        <PageIntro
          subtitle="BROWSE ALL CARDS"
          title="Platform Flashcard Library"
          description="829 expert-written flashcards covering all 12 Chemistry topics. Each card uses Cambridge exam command words and includes an Urdu memory hint. Save any card to your personal bank for focused review."
          tip="Filter by topic to focus on what you are studying this week."
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:gap-8">
        <aside className="md:w-56 md:shrink-0">
          <p className="heading-font text-xs font-bold uppercase tracking-wide text-slate-500">Topics</p>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0" aria-label="Filter by topic">
            <SidebarLink href="/flashcards/browse" active={!topicFromUrl}>
              All topics
            </SidebarLink>
            {topicSidebar.map(({ slug, href, active }) => (
              <SidebarLink key={slug} href={href} active={active}>
                <span className="line-clamp-2">{slug}</span>
              </SidebarLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <p className="body-font mb-6 text-sm leading-relaxed text-slate-600">
            {topicFromUrl ? (
              <>
                Showing <strong className="text-slate-800">{topicFromUrl}</strong>
              </>
            ) : (
              <>All syllabus topics</>
            )}{" "}
            · {totalCount.toLocaleString()} cards
            {!userId && (
              <>
                {" "}
                ·{" "}
                <Link href="/login" className="font-semibold text-brand-teal hover:underline">
                  Sign in
                </Link>{" "}
                to save to your bank
              </>
            )}
          </p>

          <label className="mb-6 block">
            <span className="sr-only">Search flashcards</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search question or answer..."
              autoComplete="off"
              className="body-font w-full rounded-xl border border-teal-100 bg-white px-4 py-3 text-[15px] text-slate-900 shadow-sm outline-none ring-brand-teal/30 transition placeholder:text-slate-500 focus:ring-2"
            />
          </label>

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
              <div className="grid gap-4 sm:grid-cols-2">
                {cards.map((card) => (
                  <FlashcardTile
                    key={card.id}
                    card={card}
                    mode="browse"
                    isSaved={savedIds.has(card.id)}
                    saveLoading={saveBusyId === card.id}
                    onToggleSave={() => onToggleSave(card.id)}
                  />
                ))}
              </div>

              <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
                {activePage > 1 ? (
                  <PaginationLink topic={topicFromUrl} page={activePage - 1} label="Previous" />
                ) : (
                  <span className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400">Previous</span>
                )}
                <span className="px-2 text-sm text-slate-600">
                  Page {activePage} of {totalPages}
                </span>
                {activePage < totalPages ? (
                  <PaginationLink topic={topicFromUrl} page={activePage + 1} label="Next" />
                ) : (
                  <span className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400">Next</span>
                )}
              </nav>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-semibold transition md:w-full md:truncate ${
        active
          ? "bg-brand-teal text-white shadow-sm"
          : "border border-teal-100 bg-white text-brand-teal hover:bg-teal-50"
      }`}
    >
      {children}
    </Link>
  );
}

function PaginationLink({ topic, page, label }: { topic: string | null; page: number; label: string }) {
  return (
    <Link
      href={buildBrowseHref(topic, page)}
      scroll
      className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-brand-teal shadow-sm hover:bg-teal-50"
    >
      {label}
    </Link>
  );
}

export default function FlashcardsBrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-8">
        <p className="mx-auto max-w-6xl text-sm text-slate-600">Loading browse...</p>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
