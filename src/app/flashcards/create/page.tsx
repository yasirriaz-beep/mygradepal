"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import PageIntro from "@/components/PageIntro";
import { FLASHCARD_COMMAND_WORDS } from "@/lib/flashcards";
import { FLASHCARD_BROWSE_TOPICS } from "@/lib/flashcardBrowseTopics";
import { flashcardsFetch } from "@/lib/flashcardApi";
import { supabase } from "@/lib/supabase";

const initialForm = {
  front: "",
  back: "",
  hint: "",
  chapter: "",
  subtopic: "",
  command_word: "State" as string,
};

export default function FlashcardsCreatePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (justSaved) return;
    if (!checkingAuth && userId && !form.chapter && FLASHCARD_BROWSE_TOPICS[0]) {
      setForm((f) => ({ ...f, chapter: String(FLASHCARD_BROWSE_TOPICS[0]) }));
    }
  }, [checkingAuth, userId, form.chapter, justSaved]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const front = form.front.trim();
    const back = form.back.trim();
    const hint = form.hint.trim();
    const chapter = form.chapter.trim();
    const subtopic = form.subtopic.trim();
    const command_word = form.command_word.trim();

    if (!front || !back || !chapter || !command_word) {
      setSubmitError("Please fill in Front, Back, Topic, and Command word.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        subject: "Chemistry",
        chapter,
        subtopic: subtopic || undefined,
        front,
        back,
        hint: hint || undefined,
        command_word,
        tier: 1,
        is_platform: false,
      };

      const res = await flashcardsFetch("/api/flashcards/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let msg = "";
      try {
        const j = (await res.json()) as { error?: string };
        msg = j.error ?? "";
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        setSubmitError(msg || `Save failed (${res.status}).`);
        return;
      }

      setJustSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <p className="body-font text-[15px] text-slate-600">Loading…</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link href="/flashcards" className="inline-block text-sm font-semibold text-[#189080] hover:underline">
          ← Flashcards hub
        </Link>
        <PageIntro
          subtitle="CREATE A CARD"
          title="Make Your Own Flashcard"
          description="Create custom flashcards for concepts you find difficult or want to remember in your own words. Your cards are saved to your personal bank."
          tip="Writing a flashcard yourself is already revision. The act of deciding what goes on the front and back helps memory more than just reading."
        />
        <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <p className="body-font text-[15px] leading-relaxed text-slate-800">Sign in to save cards to your bank</p>
          <Link
            href="/login"
            className="mt-4 inline-flex w-full justify-center rounded-xl bg-brand-teal px-4 py-3 text-center text-sm font-bold text-white hover:opacity-95 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  if (justSaved) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link href="/flashcards" className="inline-block text-sm font-semibold text-[#189080] hover:underline">
          ← Flashcards hub
        </Link>
        <PageIntro
          subtitle="CREATE A CARD"
          title="Make Your Own Flashcard"
          description="Create custom flashcards for concepts you find difficult or want to remember in your own words. Your cards are saved to your personal bank."
          tip="Writing a flashcard yourself is already revision. The act of deciding what goes on the front and back helps memory more than just reading."
        />

        <div className="space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="body-font font-semibold text-emerald-900">Card saved to your bank!</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setJustSaved(false);
                setForm({
                  ...initialForm,
                  chapter: String(FLASHCARD_BROWSE_TOPICS[0]),
                  command_word: "State",
                });
                setSubmitError(null);
              }}
              className="inline-flex rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-bold text-white hover:opacity-95"
            >
              Create another
            </button>
            <Link
              href="/flashcards/my-bank"
              className="inline-flex items-center rounded-xl border-2 border-brand-teal bg-white px-5 py-2.5 text-sm font-bold text-brand-teal hover:bg-teal-50"
            >
              View my bank →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <Link href="/flashcards" className="inline-block text-sm font-semibold text-[#189080] hover:underline">
        ← Flashcards hub
      </Link>
      <PageIntro
        subtitle="CREATE A CARD"
        title="Make Your Own Flashcard"
        description="Create custom flashcards for concepts you find difficult or want to remember in your own words. Your cards are saved to your personal bank."
        tip="Writing a flashcard yourself is already revision. The act of deciding what goes on the front and back helps memory more than just reading."
      />

      <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {submitError && (
            <p className="body-font rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {submitError}
            </p>
          )}

          {/* Front */}
          <div>
            <label htmlFor="fc-front" className="body-font mb-1 block text-[15px] font-semibold text-slate-900">
              Front — what the question asks
            </label>
            <textarea
              id="fc-front"
              required
              rows={3}
              value={form.front}
              onChange={(e) => setForm((f) => ({ ...f, front: e.target.value }))}
              placeholder='e.g. State the two conditions needed for rusting to occur'
              className="body-font mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px] outline-none ring-[#189080]/25 transition focus:border-[#189080] focus:ring-2"
            />
          </div>

          {/* Back */}
          <div>
            <label htmlFor="fc-back" className="body-font mb-1 block text-[15px] font-semibold text-slate-900">
              Back — the mark scheme answer
            </label>
            <textarea
              id="fc-back"
              required
              rows={4}
              value={form.back}
              onChange={(e) => setForm((f) => ({ ...f, back: e.target.value }))}
              placeholder={"e.g. Oxygen (or air) AND water (or moisture) must both be present"}
              className="body-font mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px] outline-none ring-[#189080]/25 transition focus:border-[#189080] focus:ring-2"
            />
          </div>

          {/* Hint */}
          <div>
            <label htmlFor="fc-hint" className="body-font mb-1 block text-[15px] font-semibold text-slate-900">
              Hint — Urdu or memory trick (optional)
            </label>
            <input
              id="fc-hint"
              type="text"
              value={form.hint}
              onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))}
              placeholder="e.g. Zaang ke liye paani aur hawa dono chahiye"
              className="body-font mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px] outline-none ring-[#189080]/25 transition focus:border-[#189080] focus:ring-2"
            />
          </div>

          {/* Topic */}
          <div>
            <label htmlFor="fc-topic" className="body-font mb-1 block text-[15px] font-semibold text-slate-900">
              Topic
            </label>
            <select
              id="fc-topic"
              required
              value={form.chapter || ""}
              onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))}
              className="body-font mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none ring-[#189080]/25 transition focus:border-[#189080] focus:ring-2"
            >
              <option value="" disabled>
                Select a topic…
              </option>
              {FLASHCARD_BROWSE_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Subtopic */}
          <div>
            <label htmlFor="fc-subtopic" className="body-font mb-1 block text-[15px] font-semibold text-slate-900">
              Subtopic
            </label>
            <input
              id="fc-subtopic"
              type="text"
              value={form.subtopic}
              onChange={(e) => setForm((f) => ({ ...f, subtopic: e.target.value }))}
              placeholder="e.g. Corrosion and Rusting"
              className="body-font mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px] outline-none ring-[#189080]/25 transition focus:border-[#189080] focus:ring-2"
            />
          </div>

          {/* Command word */}
          <div>
            <label htmlFor="fc-cw" className="body-font mb-1 block text-[15px] font-semibold text-slate-900">
              Command word
            </label>
            <select
              id="fc-cw"
              required
              value={form.command_word}
              onChange={(e) => setForm((f) => ({ ...f, command_word: e.target.value }))}
              className="body-font mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] outline-none ring-[#189080]/25 transition focus:border-[#189080] focus:ring-2"
            >
              {FLASHCARD_COMMAND_WORDS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="body-font mt-2 w-full rounded-xl bg-brand-teal px-4 py-3 text-[15px] font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save to my bank"}
          </button>
        </form>
      </div>
    </main>
  );
}
