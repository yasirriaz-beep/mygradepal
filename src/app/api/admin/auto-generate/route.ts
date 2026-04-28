import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYLLABUS: Record<string, {
  target: number;
  mcqTarget: number;
  theoryTarget: number;
  practicalTarget: number;
  subtopics: string[];
}> = {
  "States of Matter": { target: 40, mcqTarget: 28, theoryTarget: 8, practicalTarget: 4, subtopics: ["Kinetic particle theory", "Gas laws", "Changes of state"] },
  "Atoms, Elements and Compounds": { target: 100, mcqTarget: 70, theoryTarget: 20, practicalTarget: 10, subtopics: ["Atomic structure", "Isotopes", "Ionic bonding", "Covalent bonding", "Metallic bonding"] },
  "Stoichiometry": { target: 150, mcqTarget: 105, theoryTarget: 30, practicalTarget: 15, subtopics: ["Relative molecular mass", "The mole", "Mole calculations", "Empirical formula", "Gas volumes at RTP"] },
  "Electrochemistry": { target: 100, mcqTarget: 70, theoryTarget: 20, practicalTarget: 10, subtopics: ["Electrolysis basics", "Electrode reactions", "Electroplating", "Fuel cells"] },
  "Chemical Energetics": { target: 80, mcqTarget: 56, theoryTarget: 16, practicalTarget: 8, subtopics: ["Exothermic reactions", "Endothermic reactions", "Bond energies", "Energy profile diagrams"] },
  "Chemical Reactions": { target: 150, mcqTarget: 105, theoryTarget: 30, practicalTarget: 15, subtopics: ["Rate of reaction", "Collision theory", "Catalysts", "Reversible reactions", "Equilibrium"] },
  "Acids, Bases and Salts": { target: 150, mcqTarget: 105, theoryTarget: 30, practicalTarget: 15, subtopics: ["pH scale", "Neutralisation", "Salt preparation", "Titration calculations"] },
  "The Periodic Table": { target: 100, mcqTarget: 70, theoryTarget: 20, practicalTarget: 10, subtopics: ["Group 1 properties", "Group 7 properties", "Period 3 trends", "Transition metals"] },
  Metals: { target: 100, mcqTarget: 70, theoryTarget: 20, practicalTarget: 10, subtopics: ["Reactivity series", "Extraction of metals", "Corrosion and rusting", "Alloys"] },
  "Chemistry of the Environment": { target: 60, mcqTarget: 42, theoryTarget: 12, practicalTarget: 6, subtopics: ["Water treatment", "Air pollution", "Greenhouse effect", "Fertilisers"] },
  "Organic Chemistry": { target: 150, mcqTarget: 105, theoryTarget: 30, practicalTarget: 15, subtopics: ["Alkanes", "Alkenes", "Alcohols", "Carboxylic acids", "Addition polymers", "Esters"] },
  "Experimental Techniques & Analysis": { target: 120, mcqTarget: 84, theoryTarget: 24, practicalTarget: 12, subtopics: ["Filtration and evaporation", "Chromatography", "Distillation", "Flame tests", "Ion tests", "Titration procedure"] },
};

const SUBJECT_CODES: Record<string, string> = {
  Chemistry: "0620",
  Physics: "0625",
  Mathematics: "0580",
  Biology: "0610",
};

// GET — check what gaps exist
export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("subject") ?? "Chemistry";

  const { data } = await supabase
    .from("questions")
    .select("topic, subtopic, paper_type, difficulty")
    .eq("subject", subject);

  const rows = data ?? [];

  const gaps = Object.entries(SYLLABUS).map(([topic, config]) => {
    const topicRows = rows.filter((r) => r.topic === topic);
    const mcqCount = topicRows.filter((r) => r.paper_type === "MCQ").length;
    const theoryCount = topicRows.filter((r) => r.paper_type === "Theory").length;
    const practCount = topicRows.filter((r) => r.paper_type === "Practical").length;
    const totalCount = topicRows.length;

    const mcqGap = Math.max(0, config.mcqTarget - mcqCount);
    const theoryGap = Math.max(0, config.theoryTarget - theoryCount);
    const practGap = Math.max(0, config.practicalTarget - practCount);
    const totalGap = Math.max(0, config.target - totalCount);

    // Find uncovered subtopics
    const coveredSubtopics = new Set(topicRows.map((r) => r.subtopic));
    const uncoveredSubtopics = config.subtopics.filter((s) => !coveredSubtopics.has(s));

    return {
      topic,
      totalCount,
      target: config.target,
      totalGap,
      mcqGap,
      theoryGap,
      practGap,
      uncoveredSubtopics,
      complete: totalCount >= config.target,
    };
  });

  const totalGap = gaps.reduce((a, g) => a + g.totalGap, 0);
  const totalCurrent = gaps.reduce((a, g) => a + g.totalCount, 0);
  const totalTarget = gaps.reduce((a, g) => a + g.target, 0);

  return NextResponse.json({ gaps, totalGap, totalCurrent, totalTarget });
}

// POST — run one auto-generation batch
export async function POST(req: NextRequest) {
  const { subject, topic, paperType, batchSize, autoApprove } =
    (await req.json()) as {
      subject: string;
      topic: string;
      paperType: "MCQ" | "Theory" | "Practical";
      batchSize: number;
      autoApprove: boolean | string;
    };
  console.log("autoApprove value received:", autoApprove, typeof autoApprove);

  const config = SYLLABUS[topic];
  if (!config) return NextResponse.json({ error: "Unknown topic" }, { status: 400 });

  // Get existing questions to avoid duplicates
  const { data: existing } = await supabase
    .from("questions")
    .select("question_text, subtopic")
    .eq("subject", subject)
    .eq("topic", topic)
    .eq("paper_type", paperType)
    .limit(100);

  const existingSummary = (existing ?? []).length > 0
    ? `\n\nALREADY EXISTS — do NOT repeat these:\n${
        (existing ?? []).map((q: { question_text: string }, i: number) =>
          `${i + 1}. ${q.question_text.slice(0, 100)}`
        ).join("\n")
      }`
    : "";

  // Figure out which subtopics need coverage
  const coveredSubtopics = new Set((existing ?? []).map((q: { subtopic: string }) => q.subtopic));
  const uncovered = config.subtopics.filter((s) => !coveredSubtopics.has(s));
  const targetSubtopics = uncovered.length > 0 ? uncovered : config.subtopics;
  const focusSubtopic = targetSubtopics[Math.floor(Math.random() * targetSubtopics.length)];

  const systemPrompt = `You are an expert Cambridge IGCSE Chemistry (${SUBJECT_CODES[subject] ?? "0620"}) examiner.
Generate ${paperType} questions for MyGradePal Expert question bank.

STRICT RULES:
1. NEVER copy exact past paper questions
2. ONLY test 2023-2025 Cambridge IGCSE syllabus content
3. Distractors must reflect real student misconceptions
4. mygradepal_explanation must explain correct AND why wrong answer is wrong
5. Use only Cambridge command words
6. Return ONLY valid JSON array — no markdown, no preamble
7. Vary difficulty: mix of Easy, Medium, Hard in each batch
8. TOPIC NAME: You MUST use the topic name EXACTLY as provided in the request — do not rename, abbreviate or rephrase it. The topic field in every question JSON must exactly match: "${topic}"
9. Cover different syllabus points — no two questions on identical concept

QUESTION TYPE: ${paperType === "MCQ" ? "Multiple Choice — 4 options A B C D" : paperType === "Theory" ? "Structured Theory — multi-part with sub-parts a b c" : "Practical Scenario — experiment-based"}

JSON SCHEMA (return array of ${batchSize}):
[{
  "question_text": "...",
  "options": ${paperType === "MCQ" ? '{"A":"...","B":"...","C":"...","D":"..."}' : "null"},
  "correct_answer": "...",
  "mark_scheme": "step by step with [1] marks",
  "mygradepal_explanation": "tutor-style explanation 2-3 sentences",
  "common_mistake": "most common student error",
  "exam_tip": "Cambridge-specific technique tip",
  "syllabus_ref": "e.g. 3.2",
  "difficulty_level": "Easy|Medium|Hard",
  "command_word": "Calculate|Define|Describe|Explain|State|Suggest|Deduce",
  "paper_type": "${paperType}",
  "topic": "${topic}",
  "subtopic": "specific subtopic name"
}]`;

  const userPrompt = `Generate ${batchSize} ${paperType} questions.
Topic: ${topic}
Focus subtopic: ${focusSubtopic}
Mix difficulties: approximately 30% Easy, 50% Medium, 20% Hard
${existingSummary}`;

  try {
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

    let questions: Record<string, unknown>[];
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      questions = JSON.parse(clean) as Record<string, unknown>[];
    } catch {
      return NextResponse.json({ error: "Parse failed", raw: rawText.slice(0, 200) }, { status: 422 });
    }

    // If autoApprove — save directly to questions table
    // If not — save to pending_questions for review
    const shouldAutoApprove = autoApprove === true || autoApprove === "true";
    const tableName = shouldAutoApprove ? "questions" : "pending_questions";

    const rows = questions.map((q, i) => ({
      subject,
      paper_code: SUBJECT_CODES[subject] ?? "0620",
      year: new Date().getFullYear(),
      session: "Generated",
      paper_type: String(q.paper_type ?? paperType),
      question_number: String(i + 1),
      topic: topic, // Always use the request topic, not Claude's version
      subtopic: String(q.subtopic ?? focusSubtopic),
      difficulty: String(q.difficulty_level ?? "medium").toLowerCase(),
      marks: paperType === "MCQ" ? 1 : 3,
      question_text: String(q.question_text ?? ""),
      mark_scheme: String(q.mark_scheme ?? ""),
      feedback: String(q.mygradepal_explanation ?? ""),
      hint: String(q.exam_tip ?? ""),
      grade_level: "IGCSE",
      curriculum: "Cambridge",
      frequency_score: 50,
      prediction_tier: "possible",
      source: "MGP_Generated",
      options_json: q.options ? JSON.stringify(q.options) : null,
      common_mistake: String(q.common_mistake ?? ""),
      exam_tip: String(q.exam_tip ?? ""),
      syllabus_ref: String(q.syllabus_ref ?? ""),
      command_word: String(q.command_word ?? ""),
    }));

    const { data: saved, error } = await supabase
      .from(tableName)
      .insert(rows)
      .select("id");

    if (error) {
      console.error("Save error:", error.message, "table:", tableName);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      saved: saved?.length ?? 0,
      topic,
      paperType,
      subtopic: focusSubtopic,
      autoApprove,
      tableName,
    });
  } catch (err) {
    console.error("Auto-generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
