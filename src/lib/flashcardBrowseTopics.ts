/** Platform browse/hub chips — matches `flashcards.chapter` for `is_platform` rows. */
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
  "Experimental Techniques and Analysis",
] as const;

export type FlashcardBrowseTopic = (typeof FLASHCARD_BROWSE_TOPICS)[number];
