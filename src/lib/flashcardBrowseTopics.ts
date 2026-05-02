/** Platform browse/hub chips — UI labels for topic filters & links. */
export const FLASHCARD_BROWSE_TOPICS = [
  "States of Matter",
  "Atoms, Elements and Compounds",
  "Stoichiometry",
  "Electrochemistry",
  "Chemical Energetics",
  "Chemical Reactions",
  "Acids, Bases and Salts",
  "The Periodic Table",
  "Metals",
  "Air and Water",
  "Organic Chemistry",
  "Experimental Techniques",
] as const;

export type FlashcardBrowseTopic = (typeof FLASHCARD_BROWSE_TOPICS)[number];

/**
 * Maps a UI chip to one or more `flashcards.chapter` values (legacy DB names differ).
 */
export function chapterDbValuesForTopicChip(chip: string): string[] {
  if (chip === "Experimental Techniques") {
    return ["Experimental Techniques", "Experimental Techniques and Analysis"];
  }
  return [chip];
}

export function cardChapterMatchesTopicChip(cardChapter: string, topicChip: string | null): boolean {
  if (!topicChip) return true;
  return chapterDbValuesForTopicChip(topicChip).includes(cardChapter);
}
