"use client";

import PageIntro from "@/components/PageIntro";

export default function FlashcardsPrintPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <PageIntro
        subtitle="PRINT YOUR BANK"
        title="Print Flashcards"
        description="Select cards from your bank and download a print-ready PDF. Cut them out and study anywhere — no phone needed."
        tip="Physical flashcards are proven to improve recall. The act of physically flipping a card engages your brain differently than a screen."
      />
      <p className="body-font text-[15px] leading-relaxed text-slate-600">Print flashcards content</p>
    </main>
  );
}
