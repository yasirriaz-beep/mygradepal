"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import FlashcardTile, { type FlashcardRow } from "@/components/flashcards/FlashcardTile";
import PageIntro from "@/components/PageIntro";
import { CHEMISTRY_TOPICS, topicDisplayName } from "@/lib/topics";
import { FLASHCARD_STUDY_SESSION_IDS_KEY } from "@/lib/flashcardStudySession";
import { supabase } from "@/lib/supabase";

function shufflePick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}

export default function FlashcardsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [hydratedUser, setHydratedUser] = useState(false);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [customCount, setCustomCount] = useState<number | null>(null);
  const [masteredCount, setMasteredCount] = useState<number | null>(null);
  const [previewCards, setPreviewCards] = useState<FlashcardRow[]>([]);

  const isGuest = hydratedUser && !userId;

  const loadAuthenticatedStats = useCallback(async (uid: string) => {
    const nowIso = new Date().toISOString();

    const dueQ = supabase
      .from("flashcard_progress")
      .select("*", { count: "exact", head: true })
      .eq("student_id", uid)
      .lte("next_review_at", nowIso);

    const savesQ = supabase
      .from("flashcard_saves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid);

    const customQ = supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("created_by", uid)
      .eq("is_platform", false);

    const masteredQ = supabase
      .from("flashcard_progress")
      .select("*", { count: "exact", head: true })
      .eq("student_id", uid)
      .eq("status", "known");

    const [dueRes, savesRes, customRes, masteredRes] = await Promise.all([dueQ, savesQ, customQ, masteredQ]);

    setDueCount(dueRes.count ?? 0);
    setSavedCount(savesRes.count ?? 0);
    setCustomCount(customRes.count ?? 0);
    setMasteredCount(masteredRes.count ?? 0);
  }, []);

  const loadPreviewAndTotal = useCallback(async () => {
    const sampleQ = supabase
      .from("flashcards")
      .select("id, chapter, subtopic, front, back, hint, command_word, tier, created_by, is_platform")
      .eq("is_platform", true)
      .limit(96);

    const { data } = await sampleQ;
    const rows = (data ?? []) as FlashcardRow[];
    setPreviewCards(shufflePick(rows, Math.min(4, rows.length)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) {
        setUserId(user?.id ?? null);
        setHydratedUser(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedUser) return;
    if (userId) void loadAuthenticatedStats(userId);
    else {
      setDueCount(null);
      setSavedCount(null);
      setCustomCount(null);
      setMasteredCount(null);
    }
  }, [hydratedUser, userId, loadAuthenticatedStats]);

  useEffect(() => {
    void loadPreviewAndTotal();
  }, [loadPreviewAndTotal]);

  const handleStudyDue = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }
    const nowIso = new Date().toISOString();
    const { data: due } = await supabase
      .from("flashcard_progress")
      .select("flashcard_id")
      .eq("student_id", userId)
      .lte("next_review_at", nowIso);
    const ids = (due ?? []).map((r: { flashcard_id: string }) => r.flashcard_id);
    try {
      sessionStorage.setItem(FLASHCARD_STUDY_SESSION_IDS_KEY, JSON.stringify(ids));
    } catch {
      /* ignore quota / SSR */
    }
    router.push("/flashcards/study");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <PageIntro
        subtitle="QUICK REVISION"
        title="Your Flashcard Hub"
        description="829 Cambridge-focused flashcards built from the real syllabus. Study cards due for review, save cards to your personal bank, or browse the full deck by topic."
        tip="Flashcards work best in short daily sessions. Even 10 minutes before bed builds long-term memory."
      />

      {/* SECTION 1 — Due today */}
      <section aria-labelledby="due-heading" className="mb-12">
        <h2 id="due-heading" className="heading-font mb-4 text-xl font-bold text-slate-900">
          Due today
        </h2>
        {isGuest ? (
          <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">
              <Link href="/login" className="font-semibold text-brand-teal underline underline-offset-2">
                Sign in
              </Link>{" "}
              to track reviews and see how many flashcards are due for study today.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Cards ready for spaced review</p>
                <p className="mt-1 text-4xl font-bold tabular-nums text-brand-teal">
                  {dueCount === null ? "…" : dueCount}
                </p>
                {dueCount === 0 && (
                  <p className="mt-2 text-sm text-slate-600">No cards due — check back tomorrow.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleStudyDue()}
                className="inline-flex items-center justify-center rounded-2xl bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
              >
                Study due cards →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2 — My bank */}
      <section aria-labelledby="bank-heading" className="mb-12">
        <h2 id="bank-heading" className="heading-font mb-4 text-xl font-bold text-slate-900">
          My bank
        </h2>
        {isGuest ? (
          <p className="mb-4 text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-brand-teal underline underline-offset-2">
              Sign in
            </Link>{" "}
            to save cards, build custom cards, and print your deck.
          </p>
        ) : null}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Saved cards"
            value={isGuest ? null : savedCount}
            accent="teal"
          />
          <StatCard
            label="Custom cards"
            value={isGuest ? null : customCount}
            accent="orange"
          />
          <StatCard label="Mastered" value={isGuest ? null : masteredCount} accent="teal" />
        </div>
        <div className="flex flex-wrap gap-3">
          <HubButton
            href={isGuest ? "/login" : "/flashcards/my-bank"}
            variant="tealSolid"
          >
            Browse my bank
          </HubButton>
          <HubButton
            href={isGuest ? "/login" : "/flashcards/create"}
            variant="outline"
          >
            Create a card +
          </HubButton>
          <HubButton
            href={isGuest ? "/login" : "/flashcards/print"}
            variant="orangeOutline"
          >
            Print →
          </HubButton>
        </div>
      </section>

      {/* SECTION 3 — Browse by topic */}
      <section aria-labelledby="browse-heading" className="mb-12">
        <h2 id="browse-heading" className="heading-font mb-4 text-xl font-bold text-slate-900">
          Browse by topic
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHEMISTRY_TOPICS.map((topic) => (
            <Link
              key={topic}
              href={`/flashcards/browse?topic=${encodeURIComponent(topic)}`}
              className="rounded-full border border-brand-teal/35 bg-teal-50 px-4 py-2 text-sm font-semibold text-brand-teal transition hover:bg-brand-teal hover:text-white"
            >
              {topicDisplayName(topic)}
            </Link>
          ))}
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Preview</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {previewCards.map((card) => (
            <FlashcardTile key={card.id} card={card} mode="browse" />
          ))}
        </div>

        <div className="mt-6">
          <Link href="/flashcards/browse" className="text-sm font-bold text-brand-teal underline underline-offset-2 hover:text-brand-teal-dark">
            Browse all 829 cards →
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent: "teal" | "orange";
}) {
  const ring = accent === "teal" ? "border-brand-teal/20" : "border-brand-orange/25";
  const numColor = accent === "teal" ? "text-brand-teal" : "text-brand-orange";

  return (
    <article className={`rounded-2xl border ${ring} bg-white p-5 shadow-card`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${numColor}`}>{value === null ? "—" : value}</p>
    </article>
  );
}

function HubButton({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "tealSolid" | "outline" | "orangeOutline";
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-bold transition";

  const styles =
    variant === "tealSolid"
      ? "bg-brand-teal text-white shadow-sm hover:opacity-95"
      : variant === "outline"
        ? "border-2 border-brand-teal bg-white text-brand-teal hover:bg-teal-50"
        : "border-2 border-brand-orange bg-white text-brand-orange hover:bg-orange-50";

  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}
