import { getDbSubtopic } from "./subtopicMapping";

/**
 * Maps learn-page / URL labels to `topic_content.subtopic` keys:
 * uses `getDbSubtopic` first, then strips trailing ` — …` if unmapped.
 */
export function topicContentSubtopicKey(topic: string): string {
  const t = topic.trim();
  if (!t) return t;

  const mapped = getDbSubtopic(t);
  if (mapped !== t) return mapped;

  const dashIdx = t.indexOf(" — ");
  if (dashIdx > -1) return t.substring(0, dashIdx).trim();

  return t;
}
