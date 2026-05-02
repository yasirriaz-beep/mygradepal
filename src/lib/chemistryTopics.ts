/** Re-export from the single source of truth. Prefer `import { … } from "@/lib/topics"`. */
export {
  CHEMISTRY_TOPICS,
  CHEMISTRY_TOPICS as CHEMISTRY_EXAM_TOPICS,
  topicDisplayName,
  topicDbName,
  TOPIC_DISPLAY_NAMES,
  type ChemistryTopic,
  type ChemistryTopic as ChemistryExamTopic,
} from "./topics";
