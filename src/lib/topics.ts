export const CHEMISTRY_TOPICS = [
  "States of Matter",
  "Atoms Elements and Compounds",
  "Stoichiometry",
  "Electrochemistry",
  "Chemical Energetics",
  "Chemical Reactions",
  "Acids Bases and Salts",
  "The Periodic Table",
  "Metals",
  "Air and Water",
  "Organic Chemistry",
  "Experimental Techniques",
] as const;

export type ChemistryTopic = (typeof CHEMISTRY_TOPICS)[number];

export const TOPIC_DISPLAY_NAMES = {
  "States of Matter": "States of Matter",
  "Atoms Elements and Compounds": "Atoms, Elements and Compounds",
  Stoichiometry: "Stoichiometry",
  Electrochemistry: "Electrochemistry",
  "Chemical Energetics": "Chemical Energetics",
  "Chemical Reactions": "Chemical Reactions",
  "Acids Bases and Salts": "Acids, Bases and Salts",
  "The Periodic Table": "The Periodic Table",
  Metals: "Metals",
  "Air and Water": "Air and Water",
  "Organic Chemistry": "Organic Chemistry",
  "Experimental Techniques": "Experimental Techniques",
} satisfies Record<ChemistryTopic, string>;

/** DB name → display name */
export function topicDisplayName(dbName: string): string {
  return TOPIC_DISPLAY_NAMES[dbName as ChemistryTopic] ?? dbName;
}

/** Display name → DB name */
export function topicDbName(displayName: string): string {
  const entry = Object.entries(TOPIC_DISPLAY_NAMES).find(([, v]) => v === displayName);
  return entry ? entry[0] : displayName;
}
