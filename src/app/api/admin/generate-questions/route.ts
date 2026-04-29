import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUBJECT_CODES: Record<string, string> = {
  Chemistry: "0620",
  Physics: "0625",
  Mathematics: "0580",
  Biology: "0610",
  English: "0510",
  "Pakistan Studies": "0448",
};

const CHEMISTRY_TOPICS: Record<string, string[]> = {
  "States of Matter": ["Kinetic particle theory", "Gas laws", "Changes of state"],
  "Atoms, Elements and Compounds": ["Atomic structure", "Isotopes", "Ionic and covalent bonding", "Metallic bonding"],
  "Stoichiometry": ["Relative molecular mass", "The mole", "Mole calculations", "Empirical formula", "Gas volumes"],
  "Electrochemistry": ["Electrolysis", "Electrode reactions", "Electroplating", "Fuel cells"],
  "Chemical Energetics": ["Exothermic reactions", "Endothermic reactions", "Bond energies", "Energy profiles"],
  "Chemical Reactions": ["Rate of reaction", "Collision theory", "Catalysts", "Reversible reactions", "Equilibrium"],
  "Acids, Bases and Salts": ["pH scale", "Neutralisation", "Salt preparation", "Titration calculations"],
  "The Periodic Table": ["Group properties", "Period 3 trends", "Transition metals", "Noble gases"],
  Metals: ["Reactivity series", "Extraction of metals", "Corrosion", "Alloys"],
  "Chemistry of the Environment": ["Water treatment", "Air pollution", "Greenhouse effect", "Fertilisers"],
  "Organic Chemistry": ["Alkanes", "Alkenes", "Alcohols", "Carboxylic acids", "Polymers", "Esters"],
  "Experimental Techniques & Analysis": ["Separation techniques", "Chromatography", "Identification tests", "Titration", "Practical skills"],
};

const TOPIC_TARGETS: Record<string, number> = {
  "States of Matter": 40,
  "Atoms, Elements and Compounds": 100,
  "Stoichiometry": 150,
  "Electrochemistry": 100,
  "Chemical Energetics": 80,
  "Chemical Reactions": 150,
  "Acids, Bases and Salts": 150,
  "The Periodic Table": 100,
  Metals: 100,
  "Chemistry of the Environment": 60,
  "Organic Chemistry": 150,
  "Experimental Techniques & Analysis": 120,
};

interface GeneratedQuestion {
  question_text: string;
  options: { A: string; B: string; C: string; D: string } | null;
  correct_answer: string;
  mark_scheme: string;
  mygradepal_explanation: string;
  common_mistake: string;
  exam_tip: string;
  syllabus_ref: string;
  difficulty_level: string;
  command_word: string;
  paper_type: string;
  topic: string;
  subtopic: string;
}

// GET — fetch topic progress stats
export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("subject") ?? "Chemistry";

  const { data } = await supabase
    .from("questions")
    .select("topic")
    .eq("subject", subject);

  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { topic: string }) => {
    counts[r.topic] = (counts[r.topic] ?? 0) + 1;
  });

  const progress = Object.entries(TOPIC_TARGETS).map(([topic, target]) => ({
    topic,
    current: counts[topic] ?? 0,
    target,
    pct: Math.round(((counts[topic] ?? 0) / target) * 100),
  }));

  return NextResponse.json({ progress });
}

// POST — generate questions with Claude
export async function POST(req: NextRequest) {
  try {
    const { subject, topic, subtopic, difficulty, paperType, count } =
      (await req.json()) as {
        subject: string;
        topic: string;
        subtopic: string;
        difficulty: string;
        paperType: string;
        count: number;
      };

    if (!subject || !topic || !paperType || !count) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch existing questions for this topic to prevent duplicates
    const { data: existing } = await supabase
      .from("questions")
      .select("question_text, subtopic")
      .eq("subject", subject)
      .eq("topic", topic)
      .limit(50);

    const existingSummary = existing && existing.length > 0
      ? `\n\nEXISTING QUESTIONS TO AVOID REPEATING (do not regenerate these concepts):\n${
          existing.map((q: { question_text: string }, i: number) =>
            `${i + 1}. ${q.question_text.slice(0, 120)}`
          ).join("\n")
        }`
      : "";

    const isMCQ = paperType === "MCQ";
    const isTheory = paperType === "Theory";
    const isPractical = paperType === "Practical";

    const systemPrompt = `You are an expert Cambridge IGCSE ${subject} (${SUBJECT_CODES[subject] ?? "0620"}) examiner generating questions for the MyGradePal Expert question bank.

STRICT RULES:
1. NEVER copy exact past paper questions — invent new chemical scenarios, change compounds and numbers
2. ONLY test concepts in the 2023–2025 Cambridge IGCSE ${subject} syllabus — no A-Level content
3. Distractors (wrong options) MUST be based on real, common student misconceptions
4. The mygradepal_explanation MUST explain why the correct answer is right AND why the most tempting wrong answer is wrong
5. Use ONLY official Cambridge command words: Calculate, Define, Describe, Explain, State, Suggest, Deduce, Identify, Predict
6. Tag each question with the exact syllabus reference number (e.g. "3.2")
7. Return ONLY a valid JSON array — no markdown fences, no preamble, no explanation outside the JSON

QUESTION TYPE: ${isMCQ ? "Multiple Choice (Paper 2 style) — 4 options A B C D, one correct" : isTheory ? "Structured Theory (Paper 4 style) — multi-part question with sub-parts a b c" : "Practical Scenario (Paper 6 style) — experiment-based, data interpretation or design"}

DIFFICULTY: ${difficulty}
${difficulty === "Easy" ? "— Recall and recognition. 1–2 step thinking. Command words: State, Define, Identify" : ""}
${difficulty === "Medium" ? "— Application and calculation. 2–3 step thinking. Command words: Calculate, Describe, Explain" : ""}
${difficulty === "Hard" ? "— Analysis and evaluation. Multi-step. Command words: Suggest, Deduce, Predict, Explain" : ""}
${difficulty === "Mixed" ? "— Mix of Easy, Medium and Hard questions" : ""}

OUTPUT SCHEMA — return a JSON array of exactly ${count} questions:
[
  {
    "question_text": "full question text here including all sub-parts if theory",
    "options": ${isMCQ ? '{ "A": "...", "B": "...", "C": "...", "D": "..." }' : "null"},
    "correct_answer": "${isMCQ ? "A, B, C, or D" : "full mark scheme answer"}",
    "mark_scheme": "step by step marking points each on new line with [1] mark allocations",
    "mygradepal_explanation": "2-3 sentences explaining the concept clearly as a tutor would",
    "common_mistake": "the single most common error students make on this question type",
    "exam_tip": "one specific Cambridge exam technique tip",
    "syllabus_ref": "e.g. 3.2",
    "difficulty_level": "${difficulty === "Mixed" ? "Easy or Medium or Hard" : difficulty}",
    "command_word": "the primary Cambridge command word used",
    "paper_type": "${paperType}",
    "topic": "${topic}",
    "subtopic": "${subtopic || topic}"
  }
]`;

    const userPrompt = `Generate ${count} ${difficulty} ${paperType} questions for:
Subject: ${subject}
Topic: ${topic}
Subtopic: ${subtopic || "General"}

Focus specifically on: ${subtopic || topic}
Make questions varied — do not repeat the same concept twice.${existingSummary}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let questions: GeneratedQuestion[];
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      questions = JSON.parse(clean) as GeneratedQuestion[];
    } catch {
      return NextResponse.json(
        { error: "Claude returned invalid JSON. Try again.", raw: rawText.slice(0, 300) },
        { status: 422 }
      );
    }

    return NextResponse.json({ questions, count: questions.length });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

// PUT — save approved questions to Supabase
export async function PUT(req: NextRequest) {
  try {
    const { questions, subject } = (await req.json()) as {
      questions: Array<GeneratedQuestion & { approved: boolean }>;
      subject: string;
    };

    const approved = questions.filter((q) => q.approved);
    if (approved.length === 0) {
      return NextResponse.json({ error: "No questions approved" }, { status: 400 });
    }

    const rows = approved.map((q, i) => ({
      subject: subject,
      paper_code: SUBJECT_CODES[subject] ?? "0620",
      year: new Date().getFullYear(),
      session: "Generated",
      paper_type: q.paper_type,
      question_number: String(i + 1),
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty_level?.toLowerCase() ?? "medium",
      marks: q.paper_type === "MCQ" ? 1 : 3,
      question_text: q.question_text,
      mark_scheme: q.mark_scheme,
      feedback: q.mygradepal_explanation,
      hint: q.exam_tip,
      grade_level: "IGCSE",
      curriculum: "Cambridge",
      frequency_score: 50,
      prediction_tier: "possible",
      source: "MGP_Generated",
      // IMPORTANT: always populate correct_answer field for MCQ questions.
      // Extract the letter (A/B/C/D) before saving.
      correct_answer: q.paper_type === "MCQ" ? String(q.correct_answer ?? "").trim().charAt(0).toUpperCase() : "",
      options_json: q.options ? JSON.stringify(q.options) : null,
      common_mistake: q.common_mistake,
      exam_tip: q.exam_tip,
      syllabus_ref: q.syllabus_ref,
      command_word: q.command_word,
    }));

    const { data, error } = await supabase.from("questions").insert(rows).select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: data?.length ?? 0 });
  } catch (err) {
    console.error("Save error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
