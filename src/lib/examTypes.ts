export type ExamModeType = "practice" | "exam";
export type YearFilter = "all" | "5y" | "3y";
export type DifficultyFilter = "all" | "easy" | "medium" | "hard";
export type QuestionCountChoice = 10 | 20 | 40 | "all";

export type ExamQuestionRow = {
  id: string;
  question_id: string;
  topic: string;
  subtopic: string;
  marks: number;
  difficulty: string;
  year: number;
  paper_type: string | null;
  question_type: string | null;
  question_text: string;
  mark_scheme: string | null;
  exam_tip: string | null;
  has_diagram: boolean;
  image_ref: string | null;
  options_json: string | null;
  mygradepal_explanation: string | null;
  source: string | null;
};

export type ExamSetupPayload = {
  topic: string;
  /** "all" = all topics */
  topicValue: "all" | string;
  countChoice: QuestionCountChoice;
  mode: ExamModeType;
  difficulty: DifficultyFilter;
  yearFilter: YearFilter;
};

export type SelfMark = "full" | "partial" | "zero" | null;

export type ExamQuestionState = {
  textAnswer: string;
  selectedMcq: string | null;
  flagged: boolean;
  submitted: boolean;
  selfMark: SelfMark;
  /** practice mode only */
  hintRevealed: boolean;
};

export type ExamResultItem = {
  question: ExamQuestionRow;
  textAnswer: string;
  selectedMcq: string | null;
  selfMark: SelfMark;
  awardedMarks: number;
};

export type ExamResultsPayload = {
  setup: ExamSetupPayload;
  items: ExamResultItem[];
  startedAt: number;
  endedAt: number;
  totalMarks: number;
  scoreMarks: number;
  scorePercent: number;
  grade: string;
  weakTopics: string[];
};
