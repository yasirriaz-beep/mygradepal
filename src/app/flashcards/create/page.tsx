"use client";

import PageIntro from "@/components/PageIntro";

export default function FlashcardsCreatePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <PageIntro
        subtitle="CREATE A CARD"
        title="Make Your Own Flashcard"
        description="Create custom flashcards for concepts you find difficult or want to remember in your own words. Your cards are saved to your personal bank."
        tip="Writing a flashcard yourself is already revision. The act of deciding what goes on the front and back helps memory more than just reading."
      />
      <p className="body-font text-[15px] leading-relaxed text-slate-600">Create flashcard content</p>
    </main>
  );
}
