"use client";

import Link from "next/link";

export default function LearnSubjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-[#F7F8FA] px-4 pb-24 pt-6 sm:px-6">
      <article className="rounded-2xl bg-white p-6 shadow-card">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Unable to load this subject</h1>
        <p className="mt-2 text-sm text-slate-600">An unexpected error occurred while loading the topic list.</p>
        <p className="mt-2 text-xs text-slate-500">{error.message}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white">
            Retry
          </button>
          <Link href="/learn" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Back to Learn
          </Link>
        </div>
      </article>
    </main>
  );
}
