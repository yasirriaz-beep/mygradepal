/**
 * Maps UI / syllabus display labels (learn page, URLs) to `topic_content.subtopic`
 * keys in Supabase. Display names often add an em-dash suffix, e.g.
 * "Isotopes — Definition and Properties" → "Isotopes".
 */
export function topicContentSubtopicKey(displaySubtopic: string): string {
  const t = displaySubtopic.trim();
  if (!t) return t;

  const emDash = t.indexOf(" \u2014 ");
  if (emDash !== -1) {
    return t.slice(0, emDash).trim();
  }

  const enDash = t.indexOf(" \u2013 ");
  if (enDash !== -1) {
    return t.slice(0, enDash).trim();
  }

  return t;
}
