/** IGCSE Chemistry 0620 topic names as stored in `questions.topic` (matches practice page). */
export const CHEMISTRY_EXAM_TOPICS = [
  "Acids Bases and Salts",
  "Air and Water",
  "Atoms Elements and Compounds",
  "Chemical Energetics",
  "Chemical Reactions",
  "Electrochemistry",
  "Experimental Techniques",
  "Metals",
  "Organic Chemistry",
  "States of Matter",
  "Stoichiometry",
  "The Periodic Table",
] as const;

export type ChemistryExamTopic = (typeof CHEMISTRY_EXAM_TOPICS)[number];
