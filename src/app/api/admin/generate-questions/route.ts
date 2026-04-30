import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

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

function redistributeAnswers(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const targetSequence = ['A', 'B', 'C', 'D'];

  return questions.map((q, index) => {
    if (!q.options || q.paper_type !== 'MCQ') return q;

    const targetPosition = targetSequence[index % 4];
    const currentCorrect = q.correct_answer?.trim().toUpperCase();

    if (!currentCorrect || !['A','B','C','D'].includes(currentCorrect)) return q;
    if (currentCorrect === targetPosition) return q;

    // Swap the correct answer into the target position
    const options = { ...q.options } as Record<string, string>;
    const correctValue = options[currentCorrect];
    const targetValue = options[targetPosition];

    options[currentCorrect] = targetValue;
    options[targetPosition] = correctValue;

    return {
      ...q,
      options: options as { A: string; B: string; C: string; D: string },
      correct_answer: targetPosition,
    };
  });
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

    const systemPrompt = `You are an expert Cambridge IGCSE ${subject} (${SUBJECT_CODES[subject] ?? "0620"}) examiner generating questions for the MyGradePal question bank.

CRITICAL — ANSWER POSITION ROTATION:
Assign correct answers in this exact repeating sequence:
Question 1=A, Question 2=B, Question 3=C, Question 4=D,
Question 5=A, Question 6=B, Question 7=C, Question 8=D,
Question 9=A, Question 10=B, Question 11=C, Question 12=D.

This pattern MUST be followed exactly regardless of how
many questions are requested. Do NOT choose answer
positions based on how you construct questions. Instead:
1. Assign the answer letter from the rotation first
2. Write the correct answer as that option
3. Fill remaining options with plausible distractors

VIOLATION CHECK: Count your answers before returning.
If B appears more than 30% → regenerate entire batch.
If D appears less than 20% → regenerate entire batch.

STRICT QUALITY RULES:
1. NEVER include "WAIT", "recalculate", "correction", "actually"
   in any mark scheme — if you make an error, redo the entire
   question cleanly
2. NEVER copy past paper questions — invent new scenarios
3. ONLY test concepts in the Cambridge IGCSE ${subject} syllabus
   — no A-Level content whatsoever
4. Chemistry specific: NO Kc, NO Kp, NO electrochemical series EMF
5. All RAMs must be exact Cambridge values: H=1, C=12, N=14,
   O=16, Na=23, Mg=24, Al=27, S=32, Cl=35.5, K=39, Ca=40,
   Fe=56, Cu=64, Zn=65, Br=80, Ag=108, I=127, Ba=137, Pb=207
6. Mark schemes must show every step with [1] allocations —
   never just say "B is correct [1]"
7. Wrong options must be based on real student misconceptions
8. All four options must be similar in length
9. correct_answer must be exactly the letter designated in
   the rotation above — single character only
10. question_text must end with ?

QUESTION TYPE: ${isMCQ ? "Multiple Choice — 4 options A B C D, one correct" : isTheory ? "Structured Theory — multi-part with sub-parts a b c" : "Practical Scenario — experiment-based"}

DIFFICULTY: ${difficulty}
${difficulty === "Easy" ? "Recall only. Command words: State, Identify, Name, Give. No calculations." : ""}
${difficulty === "Medium" ? "Application. Command words: Describe, Explain, Calculate. 2-3 steps." : ""}
${difficulty === "Hard" ? "Analysis. Command words: Suggest, Deduce, Predict, Evaluate. Multi-step." : ""}
${difficulty === "Mixed" ? "Mix: 30% Easy (questions ${Array.from({length:Math.ceil(count*0.3)},(_,i)=>i+1).join(',')}), 40% Medium, 30% Hard" : ""}

OUTPUT: Return ONLY a valid JSON array of exactly ${count} objects.
No markdown fences, no preamble, no text outside the JSON array.

Schema:
[{
  "question_text": "complete question ending with ?",
  "options": ${isMCQ ? '{"A":"...","B":"...","C":"...","D":"..."}' : "null"},
  "correct_answer": "the designated letter from rotation above",
  "mark_scheme": "step by step with [1] allocations, minimum 2 sentences",
  "mygradepal_explanation": "2-3 sentences explaining concept clearly",
  "common_mistake": "most common student error on this question type",
  "exam_tip": "one specific Cambridge exam technique tip",
  "syllabus_ref": "e.g. 3.2",
  "difficulty_level": "${difficulty === "Mixed" ? "Easy or Medium or Hard" : difficulty}",
  "command_word": "primary Cambridge command word",
  "paper_type": "${paperType}",
  "topic": "${topic}",
  "subtopic": "${subtopic || topic}"
}]`;

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
      console.log("DEBUG answers:", questions.map(q => ({ pt: q.paper_type, ca: q.correct_answer })));
    } catch (error) {
      Sentry.captureException(error, { tags: { component: "question_import" } });
      return NextResponse.json(
        { error: "Claude returned invalid JSON. Try again.", raw: rawText.slice(0, 300) },
        { status: 422 }
      );
    }

    const rebalanced = redistributeAnswers(questions);
    return NextResponse.json({ questions: rebalanced, count: rebalanced.length });
  } catch (err) {
    Sentry.captureException(err, { tags: { component: "question_import" } });
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

    const rows = approved.map((q, i) => {
      // Validate correct_answer
      const answer = String(q.correct_answer ?? "").trim().charAt(0).toUpperCase();
      const validAnswer = ["A","B","C","D"].includes(answer) ? answer : "";

      // Validate mark scheme
      if (q.mark_scheme?.includes("WAIT") ||
          q.mark_scheme?.includes("recalculate") ||
          q.mark_scheme?.includes("Correction:")) {
        console.warn(`Skipping question with broken mark scheme: ${q.question_text?.slice(0,50)}`);
        return null;
      }

      return {
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
        correct_answer: q.paper_type === "MCQ" ? validAnswer : "",
        options_json: q.options ? JSON.stringify(q.options) : null,
        common_mistake: q.common_mistake,
        exam_tip: q.exam_tip,
        syllabus_ref: q.syllabus_ref,
        command_word: q.command_word,
      };
    }).filter(Boolean); // removes null entries

    const { data, error } = await supabase.from("questions").insert(rows).select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: data?.length ?? 0 });
  } catch (err) {
    Sentry.captureException(err, { tags: { component: "question_import" } });
    console.error("Save error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
