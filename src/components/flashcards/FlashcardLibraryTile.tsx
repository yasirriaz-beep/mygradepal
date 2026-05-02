"use client";

import clsx from "clsx";
import { Heart, X } from "lucide-react";
import { useState, type KeyboardEvent, type MouseEvent } from "react";

import type { FlashcardRow } from "@/components/flashcards/FlashcardTile";

type Props = {
  card: FlashcardRow;
  mode: "browse" | "bank";
  /** Reduce copy/paste / context menu on card text (front/back/hint). */
  contentProtection?: boolean;
  /** Browse: tap card to reveal answer (heart still only saves). */
  expandablePreview?: boolean;
  isSaved?: boolean;
  saveLoading?: boolean;
  onToggleSave?: () => void;
  removeLoading?: boolean;
  onRemove?: () => void;
};

export default function FlashcardLibraryTile({
  card,
  mode,
  contentProtection = false,
  expandablePreview = false,
  isSaved,
  saveLoading,
  onToggleSave,
  removeLoading,
  onRemove,
}: Props) {
  const [answerOpen, setAnswerOpen] = useState(false);
  const tier = card.tier != null ? Math.min(3, Math.max(1, Number(card.tier))) : null;

  const browseExpandable = mode === "browse" && expandablePreview;

  const handleCardClick = (e: MouseEvent) => {
    if (!browseExpandable || answerOpen) return;
    const el = e.target as HTMLElement;
    if (el.closest("[data-save-heart]")) return;
    setAnswerOpen(true);
  };

  return (
    <article
      role={browseExpandable && !answerOpen ? "button" : undefined}
      tabIndex={browseExpandable && !answerOpen ? 0 : undefined}
      aria-expanded={browseExpandable ? answerOpen : undefined}
      onClick={browseExpandable ? handleCardClick : undefined}
      onKeyDown={
        browseExpandable && !answerOpen
          ? (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAnswerOpen(true);
              }
            }
          : undefined
      }
      onContextMenu={contentProtection ? (e) => e.preventDefault() : undefined}
      className={clsx(
        "relative flex min-h-[160px] flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm",
        contentProtection && "protected-content",
        browseExpandable && !answerOpen && "cursor-pointer transition hover:border-brand-teal/30 hover:shadow-md",
      )}
    >
      <div className="absolute right-3 top-3 shrink-0">
        {mode === "browse" && onToggleSave && (
          <button
            type="button"
            data-save-heart
            disabled={saveLoading}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            aria-label={isSaved ? "Saved to bank" : "Save to bank"}
            className={clsx(
              "inline-flex rounded-full p-2 transition",
              isSaved ? "bg-brand-teal text-white" : "bg-slate-100 text-brand-teal hover:bg-teal-50",
              saveLoading && "opacity-50",
            )}
          >
            <Heart className={clsx("h-5 w-5", isSaved && "fill-current")} strokeWidth={1.75} />
          </button>
        )}
        {mode === "bank" && onRemove && (
          <button
            type="button"
            disabled={removeLoading}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove"
            className="inline-flex rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      <p
        className={clsx(
          "body-font flex-1 pr-12 text-sm font-medium leading-relaxed text-slate-900",
          !(browseExpandable && answerOpen) && "line-clamp-5",
        )}
      >
        {card.front}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{card.chapter}</span>
        {card.subtopic && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{card.subtopic}</span>
        )}
        {card.command_word && (
          <span className="rounded-full border border-brand-orange/40 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
            {card.command_word}
          </span>
        )}
        {tier != null && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Tier {tier}
          </span>
        )}
      </div>

      {browseExpandable && answerOpen && (
        <div className="mt-4 border-t border-teal-100 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-teal">ANSWER</p>
          <p className="body-font mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800">{card.back}</p>
          {card.hint ? (
            <p className="body-font mt-3 text-[15px] italic leading-relaxed text-slate-500">{card.hint}</p>
          ) : null}
          <button
            type="button"
            data-hide-answer
            className="body-font mt-3 text-sm font-semibold text-brand-teal underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setAnswerOpen(false);
            }}
          >
            Hide answer
          </button>
        </div>
      )}
    </article>
  );
}
