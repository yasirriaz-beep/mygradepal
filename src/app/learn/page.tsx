"use client";

import Link from "next/link";

import BottomNav from "@/components/BottomNav";
import PageIntro from "@/components/PageIntro";

export default function LearnPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-[#F7F8FA] px-4 pb-24 pt-6 sm:px-6">
      <PageIntro
        subtitle="TRACK 1 — LEARN"
        title="Study Chemistry Topic by Topic"
        description="Work through all 12 Chemistry topics subtopic by subtopic with your expert tutoring system. Each subtopic includes an explanation, video, formulas, worked example, flashcards, and practice questions."
        tip="Follow your study plan order. Do not skip ahead — each topic builds on the last."
      />

      <section className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="heading-font text-xl font-semibold text-slate-900">Chemistry</p>
            <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">Available now</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">5,200+ past paper questions across 12 topics</p>
          <Link href="/study/chemistry" className="mt-4 inline-block rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white">
            Start learning
          </Link>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-card">
          <p className="heading-font text-xl font-semibold text-slate-900">Physics</p>
          <p className="mt-2 text-sm text-slate-600">Coming soon</p>
          <button
            type="button"
            disabled
            className="mt-4 inline-block cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Coming soon
          </button>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-card">
          <p className="heading-font text-xl font-semibold text-slate-900">Mathematics</p>
          <p className="mt-2 text-sm text-slate-600">Coming soon</p>
          <button
            type="button"
            disabled
            className="mt-4 inline-block cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
          >
            Coming soon
          </button>
        </article>
      </section>

      <BottomNav />
    </main>
  );
}
