"use client";

import PageIntro from "@/components/PageIntro";

export default function FlashcardsMyBankPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <PageIntro
        subtitle="MY SAVED CARDS"
        title="My Flashcard Bank"
        description="Your personal collection of saved and custom flashcards. Study these regularly — they are the concepts YOU found hardest and need the most practice on."
        tip="Add cards when you get a question wrong in practice. Your bank becomes your personal weak-area revision tool."
      />
      <p className="body-font text-[15px] leading-relaxed text-slate-600">My flashcard bank content</p>
    </main>
  );
}
