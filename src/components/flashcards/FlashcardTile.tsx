"use client";

import clsx from "clsx";
import { Heart, Pencil, Trash2 } from "lucide-react";

export type FlashcardRow = {
  id: string;
  chapter: string;
  subtopic: string | null;
  front: string;
  back: string;
  hint?: string | null;
  command_word: string | null;
  tier?: number | null;
  created_by?: string | null;
  is_platform?: boolean | null;
};

type Props = {
  card: FlashcardRow;
  /** Browse: heart save; bank: remove + edit */
  mode: "browse" | "bank";
  /** User has this card in flashcard_saves (browse) */
  isSaved?: boolean;
  saveLoading?: boolean;
  onToggleSave?: () => void;
  removeLoading?: boolean;
  onRemove?: () => void;
  onEdit?: () => void;
};

export default function FlashcardTile({
  card,
  mode,
  isSaved,
  saveLoading,
  onToggleSave,
  removeLoading,
  onRemove,
  onEdit,
}: Props) {
  const isCustom = Boolean(card.created_by && !card.is_platform);

  return (
    <article
      className={clsx(
        "flex flex-col rounded-2xl border border-teal-100 bg-white p-4 shadow-card transition hover:border-brand-teal/30",
        "min-h-[180px]"
      )}
    >
      <p className="body-font line-clamp-4 flex-1 text-sm font-medium leading-relaxed text-slate-800">{card.front}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-brand-teal">{card.chapter}</span>
        {card.subtopic && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{card.subtopic}</span>
        )}
        {card.command_word && (
          <span className="rounded-full border border-brand-orange/40 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
            {card.command_word}
          </span>
        )}
        {card.tier != null && (
          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">Tier {card.tier}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-teal-50 pt-3">
        {mode === "browse" && onToggleSave && (
          <button
            type="button"
            disabled={saveLoading}
            onClick={onToggleSave}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
              isSaved
                ? "border-brand-teal bg-brand-teal text-white"
                : "border-teal-200 bg-white text-brand-teal hover:bg-teal-50"
            )}
            aria-label={isSaved ? "Saved to my bank" : "Save to my bank"}
          >
            <Heart className={clsx("h-3.5 w-3.5", isSaved && "fill-current")} />
            {isSaved ? "Saved" : "Save to my bank"}
          </button>
        )}
        {mode === "bank" && (
          <>
            {onRemove && (
              <button
                type="button"
                disabled={removeLoading}
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove from bank
              </button>
            )}
            {isCustom && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
