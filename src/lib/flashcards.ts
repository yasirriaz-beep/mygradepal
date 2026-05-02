export const FLASHCARD_COMMAND_WORDS = [
  "State",
  "Define",
  "Explain",
  "Calculate",
  "Describe",
  "Name",
  "Give",
] as const;

export type FlashcardCommandWord = (typeof FLASHCARD_COMMAND_WORDS)[number];

export function isFlashcardCommandWord(s: string): s is FlashcardCommandWord {
  return (FLASHCARD_COMMAND_WORDS as readonly string[]).includes(s);
}
