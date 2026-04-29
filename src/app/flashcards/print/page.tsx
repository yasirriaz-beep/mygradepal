"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Flashcard = {
  id: string;
  chapter: string;
  front: string;
  back: string;
};

export default function FlashcardsPrintPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    const loadCards = async () => {
      const { data } = await supabase
        .from("flashcards")
        .select("id, chapter, front, back")
        .eq("subject", "Chemistry")
        .order("chapter", { ascending: true })
        .order("created_at", { ascending: true });

      setCards((data ?? []) as Flashcard[]);
    };
    void loadCards();
  }, []);

  const pages = useMemo(() => {
    const size = 8;
    const chunks: Flashcard[][] = [];
    for (let i = 0; i < cards.length; i += size) chunks.push(cards.slice(i, i + size));
    return chunks;
  }, [cards]);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "20px 16px", fontFamily: "'DM Sans', sans-serif" }}>
      <style jsx global>{`
        @media print {
          .print-controls {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-page {
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      <div className="print-controls" style={{ maxWidth: 1100, margin: "0 auto 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/flashcards" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>← Back</Link>
        <button
          onClick={() => window.print()}
          style={{
            background: "#1D9E75",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 16px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Print
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="print-page"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "repeat(4, minmax(160px, auto))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {page.map((card) => (
              <div
                key={card.id}
                style={{
                  background: "white",
                  border: "1.5px dashed #9ca3af",
                  borderRadius: 10,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#1D9E75", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {card.chapter}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.45, color: "#111827", fontWeight: 600 }}>
                  {card.front}
                </p>
                <div style={{ borderTop: "1px dotted #9ca3af", margin: "2px 0 8px" }} />
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#374151", whiteSpace: "pre-line" }}>
                  {card.back}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
