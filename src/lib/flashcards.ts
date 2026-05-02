export { CHEMISTRY_TOPICS, topicDisplayName, topicDbName, type ChemistryTopic } from "./topics";

export const FLASHCARD_COMMAND_WORDS = [
  "State",
  "Define",
  "Explain",
  "Describe",
  "Calculate",
  "Name",
  "Give",
  "Compare",
  "Suggest",
  "Predict",
] as const;

export type FlashcardCommandWord = (typeof FLASHCARD_COMMAND_WORDS)[number];

export function isFlashcardCommandWord(s: string): s is FlashcardCommandWord {
  return (FLASHCARD_COMMAND_WORDS as readonly string[]).includes(s);
}
