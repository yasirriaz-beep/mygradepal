import type { ChemistryTopic } from "./topics";
import { CHEMISTRY_TOPICS } from "./topics";

/** Platform browse/hub chips — same canonical list as `CHEMISTRY_TOPICS`. */
export const FLASHCARD_BROWSE_TOPICS = CHEMISTRY_TOPICS;

export type FlashcardBrowseTopic = ChemistryTopic;

/** Alias for callers that prefer `TOPICS` naming. */
export const TOPICS = CHEMISTRY_TOPICS;

export function cardChapterMatchesTopicChip(cardChapter: string, topicChip: string | null): boolean {
  if (!topicChip) return true;
  return cardChapter === topicChip;
}
