import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const CHEMISTRY_TOPICS = [
  {
    chapter: 1,
    title: "Experimental Chemistry",
    section: "Matter — Structures and Properties",
    subtopics: [
      "How Are Physical Quantities Measured?",
      "How Are Gases Collected?",
      "How Are Substances in Mixtures Separated?",
      "How Can the Purity of Substances Be Determined?",
    ],
  },
  {
    chapter: 2,
    title: "Kinetic Particle Theory",
    section: "Matter — Structures and Properties",
    subtopics: [
      "How Are Solids, Liquids and Gases Different?",
      "How Do Particles Move?",
    ],
  },
  {
    chapter: 3,
    title: "Atomic Structure",
    section: "Matter — Structures and Properties",
    subtopics: [
      "What Is An Atom Made Up Of?",
      "How Many Sub-atomic Particles Does An Atom Have?",
      "How Are Sub-atomic Particles Distributed in An Atom?",
    ],
  },
  {
    chapter: 4,
    title: "Chemical Bonding",
    section: "Matter — Structures and Properties",
    subtopics: [
      "Why Do Atoms Combine?",
      "What Is Ionic Bonding?",
      "What Is Covalent Bonding?",
      "What Is Metallic Bonding?",
    ],
  },
  {
    chapter: 5,
    title: "Structure and Properties of Materials",
    section: "Matter — Structures and Properties",
    subtopics: [
      "How Are Elements, Compounds and Mixtures Different?",
      "What Are the Properties of Ionic Substances?",
      "What Are the Properties of Covalent Substances?",
      "What Are the Properties of Metals and Alloys?",
      "What Can Properties Tell Us About the Structure and Bonding of Substances?",
    ],
  },
  {
    chapter: 6,
    title: "Chemical Formulae and Equations",
    section: "Chemical Reactions",
    subtopics: [
      "What Are Chemical Formulae?",
      "How Are Chemical Formulae Constructed?",
      "What Are Chemical Equations and How Do We Balance Them?",
    ],
  },
  {
    chapter: 7,
    title: "Mole Concept and Stoichiometry",
    section: "Chemical Reactions",
    subtopics: [
      "What Are Relative Atomic Mass and Relative Molecular Mass?",
      "What Is Percentage Mass?",
      "What Is the Mole?",
      "What Are Empirical and Molecular Formulae?",
      "What Is Stoichiometry?",
      "What Are Percentage Yield and Percentage Purity?",
    ],
  },
  {
    chapter: 8,
    title: "Acids and Bases",
    section: "Chemical Reactions",
    subtopics: [
      "What Is an Acid?",
      "What Are Strong and Weak Acids?",
      "What Is a Base?",
      "How Do We Compare Relative Acidity and Alkalinity?",
      "How Is the pH of Soil Controlled?",
      "How Are Oxides Classified?",
    ],
  },
  {
    chapter: 9,
    title: "Salts",
    section: "Chemical Reactions",
    subtopics: [
      "What Are Salts?",
      "How Are Salts Prepared?",
    ],
  },
  {
    chapter: 10,
    title: "Ammonia",
    section: "Chemical Reactions",
    subtopics: [
      "How Can Ammonia Be Made?",
      "What Are Some Reversible Reactions?",
    ],
  },
  {
    chapter: 11,
    title: "Qualitative Analysis",
    section: "Chemical Reactions",
    subtopics: [
      "How Do We Test for Cations?",
      "How Do We Test for Anions?",
      "How Do We Test for Gases?",
    ],
  },
  {
    chapter: 12,
    title: "Oxidation and Reduction",
    section: "Chemical Reactions",
    subtopics: [
      "What Are Oxidation and Reduction?",
      "How Do We Identify and Analyse Redox Reactions?",
    ],
  },
  {
    chapter: 13,
    title: "Electrochemistry",
    section: "Chemical Reactions",
    subtopics: [
      "What Is Electrolysis?",
      "How Do We Predict the Products of Electrolysis?",
      "How Is Electrolysis Used in Industries?",
      "What Are Simple Cells and Hydrogen Fuel Cells?",
    ],
  },
  {
    chapter: 14,
    title: "The Periodic Table",
    section: "Chemistry of Materials",
    subtopics: [
      "How Are Elements Arranged in the Periodic Table?",
      "What Group Trends Are There?",
      "What Are Transition Elements?",
    ],
  },
  {
    chapter: 15,
    title: "The Reactivity Series",
    section: "Chemistry of Materials",
    subtopics: [
      "What Is the Order of Reactivity of Metals?",
      "How Does the Reactivity of Metals Affect Their Tendency to Form Positive Ions?",
      "How Are Metals Extracted from Their Ores?",
      "What Are the Conditions for Rusting?",
    ],
  },
  {
    chapter: 16,
    title: "Chemical Energetics",
    section: "Chemistry of Materials",
    subtopics: [
      "What Is Enthalpy Change?",
      "How Do We Calculate Enthalpy Changes?",
    ],
  },
  {
    chapter: 17,
    title: "Rate of Reactions",
    section: "Chemistry of Materials",
    subtopics: [
      "How Do We Measure the Rate of Reactions?",
      "What Determines the Rate of Reactions?",
      "What Are Catalysts and How Do They Affect the Rate of Reactions?",
    ],
  },
  {
    chapter: 18,
    title: "Fuels and Crude Oil",
    section: "Chemistry in a Sustainable World",
    subtopics: [
      "Why Are Natural Gas and Crude Oil Important in Our Lives?",
      "How Can Crude Oil Be Separated?",
      "Are Biofuels More Environmentally Sustainable?",
    ],
  },
  {
    chapter: 19,
    title: "Hydrocarbons",
    section: "Chemistry in a Sustainable World",
    subtopics: [
      "What Is a Homologous Series?",
      "What Are Alkanes?",
      "What Are Alkenes?",
      "What Are Isomers?",
      "How Do Saturated and Unsaturated Compounds Differ?",
    ],
  },
  {
    chapter: 20,
    title: "Alcohols, Carboxylic Acids and Esters",
    section: "Chemistry in a Sustainable World",
    subtopics: [
      "What Are Alcohols?",
      "What Are Carboxylic Acids?",
      "What Are Esters?",
    ],
  },
  {
    chapter: 21,
    title: "Polymers",
    section: "Chemistry in a Sustainable World",
    subtopics: [
      "What Are Polymers?",
      "How Are Addition Polymers Formed and Used?",
      "How Are Condensation Polymers Formed and Used?",
      "How Does the Disposal of Plastics Affect Our Environment?",
      "How Are Plastics Recycled and What Are the Issues Related to Recycling Plastics?",
    ],
  },
  {
    chapter: 22,
    title: "Maintaining Air Quality",
    section: "Chemistry in a Sustainable World",
    subtopics: [
      "What Is Air Made Up of?",
      "What Are Air Pollutants?",
      "What Is the Ozone Layer?",
      "What Is the Carbon Cycle?",
      "What Are Global Warming and Climate Change?",
    ],
  },
];

// ─── Claude: Generate English content ────────────────────────────────────────

const ENGLISH_SYSTEM_PROMPT = `You are a friendly O Level / IGCSE Chemistry tutor explaining topics to 14-16 year old students in Pakistan.

Write like a tutor talking to a student — simple, clear, encouraging. NOT like a textbook.
Use local Pakistani examples where helpful (chai, roti, biryani, CNG, karachi weather, etc).

Respond ONLY with a valid JSON object. No markdown, no backticks, just raw JSON.

{
  "definition": "One friendly sentence explaining what this topic is about. Start with something relatable.",
  "key_points": [
    "Point 1 — simple language, max 15 words",
    "Point 2",
    "Point 3",
    "Point 4 (optional)",
    "Point 5 (optional, max 5)"
  ],
  "formulas": [
    {
      "formula": "Formula in plain text e.g. Moles = Mass divided by Molar Mass",
      "variables": "What each part means in simple words"
    }
  ],
  "worked_example": {
    "question": "A real O Level past paper style question",
    "steps": [
      "Step 1: what to do first and why",
      "Step 2: the calculation",
      "Step 3: if needed"
    ],
    "answer": "Final answer with units",
    "takeaway": "One sentence — what should the student remember from this?"
  },
  "exam_tip": "The one thing students always get wrong in the exam and how to avoid it",
  "quick_check": "One short question to test understanding — not too hard"
}

Rules:
- formulas: empty array [] if topic has no equations
- worked_example: null if topic is purely conceptual
- Never use LaTeX, markdown, stars, or backticks
- Keep language simple — imagine explaining to a bright student who finds chemistry confusing`;

// ─── Claude: Generate Urdu summary ───────────────────────────────────────────

const URDU_SYSTEM_PROMPT = `Aap ek Chemistry ke ustaad hain jo Pakistani bachon ko O Level padha rahe hain.

Is topic ka ek chota sa Urdu mein khulasa likhein — 3 se 4 asan jumlay.
Roman Urdu ya Urdu script dono theek hain.
Bilkul simple zaban use karein jaise aap ghar mein baat karte hain.
Koi technical lafz nahi — agar zaruri ho toh English mein likho.
Local misalein dein jaise chai, roti, Karachi ki garmi, CNG wagera.

Sirf text return karein — koi JSON nahi, koi formatting nahi.`;

async function generateEnglishContent(chapter: typeof CHEMISTRY_TOPICS[0], subtopic: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    system: ENGLISH_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Generate content for:
Chapter ${chapter.chapter}: ${chapter.title}
Subtopic: ${subtopic}
Section: ${chapter.section}`
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function generateUrduSummary(chapter: typeof CHEMISTRY_TOPICS[0], subtopic: string, englishDefinition: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: URDU_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Topic: ${subtopic} (Chapter ${chapter.chapter}: ${chapter.title})
English explanation: ${englishDefinition}

Ab is ka Urdu mein simple khulasa likhein.`
    }],
  });

  return response.content.find((b) => b.type === "text")?.text?.trim() ?? "";
}

// ─── Google TTS ───────────────────────────────────────────────────────────────

async function generateAudio(text: string, languageCode: string, voiceName: string): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.9,
            pitch: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`  TTS error: ${err}`);
      return null;
    }

    const data = await response.json() as { audioContent: string };
    return Buffer.from(data.audioContent, "base64");
  } catch (err) {
    console.error(`  TTS failed:`, err);
    return null;
  }
}

// ─── Supabase Storage upload ──────────────────────────────────────────────────

async function uploadAudio(buffer: Buffer, filename: string): Promise<string | null> {
  const { error } = await supabase.storage
    .from("audio")
    .upload(filename, buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) {
    console.error(`  Upload error: ${error.message}`);
    return null;
  }

  // Return public URL
  const { data } = supabase.storage.from("audio").getPublicUrl(filename);
  return data.publicUrl;
}

// ─── Build audio text ─────────────────────────────────────────────────────────

function buildEnglishAudioText(subtopic: string, content: {
  definition: string;
  key_points: string[];
  exam_tip?: string;
}): string {
  const parts = [
    `Today we are learning about: ${subtopic}.`,
    content.definition,
    "Here are the key points.",
    ...content.key_points.map((p, i) => `Point ${i + 1}. ${p}`),
  ];
  if (content.exam_tip) {
    parts.push(`Exam tip: ${content.exam_tip}`);
  }
  return parts.join(" ");
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting MyGradePal topic content population...\n");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Topics: ${CHEMISTRY_TOPICS.reduce((a, c) => a + c.subtopics.length, 0)} subtopics across ${CHEMISTRY_TOPICS.length} chapters\n`);

  let total = 0;
  let success = 0;
  let failed = 0;

  for (const chapter of CHEMISTRY_TOPICS) {
    console.log(`\n── Chapter ${chapter.chapter}: ${chapter.title} ──`);

    for (const subtopic of chapter.subtopics) {
      total++;
      console.log(`\n[${total}] ${subtopic}`);

      // Check if already fully processed
      const { data: existing } = await supabase
        .from("topic_content")
        .select("audio_url_ur, definition, urdu_summary")
        .eq("subject", "Chemistry")
        .eq("subtopic", subtopic)
        .single();

      // Skip if Urdu audio already exists
      if (existing?.audio_url_ur) {
        console.log(`  ↷ Skipping — already complete`);
        continue;
      }

      // If row exists but missing Urdu audio, only generate Urdu audio
      const urduOnly = !!existing;

      // 1. Generate English content
      let content: {
        definition: string;
        key_points: string[];
        formulas: { formula: string; variables: string }[];
        worked_example: {
          question: string;
          steps: string[];
          answer: string;
          takeaway: string;
        } | null;
        exam_tip: string;
        quick_check: string;
      } | null = null;

      if (!urduOnly) {
        try {
          content = await generateEnglishContent(chapter, subtopic);
          console.log(`  ✓ English content generated`);
        } catch (err) {
          console.log(`  ✗ English content failed:`, err);
          failed++;
          await sleep(1000);
          continue;
        }
        if (!content) {
          console.log(`  ✗ English content empty`);
          failed++;
          await sleep(1000);
          continue;
        }
      }

      // 2. Generate Urdu summary
      let urduSummary = "";
      try {
        urduSummary =
          existing?.urdu_summary && urduOnly
            ? existing.urdu_summary
            : await generateUrduSummary(chapter, subtopic, content?.definition ?? existing?.definition ?? "");
        console.log(`  ✓ Urdu summary generated`);
      } catch (err) {
        console.log(`  ✗ Urdu summary failed (continuing without it)`);
      }

      // 3. Generate English audio
      const safeFilename = subtopic.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      
      let audioUrlEn: string | null = null;
      if (!urduOnly && content) {
        const englishText = buildEnglishAudioText(subtopic, content);
        const enAudio = await generateAudio(
          englishText,
          "en-GB",
          "en-GB-Neural2-B"
        );
        if (enAudio) {
          audioUrlEn = await uploadAudio(enAudio, `chemistry/en/${safeFilename}.mp3`);
          if (audioUrlEn) console.log(`  ✓ English audio uploaded`);
        }
      }

      // 4. Generate Urdu audio
      let audioUrlUr: string | null = null;
      if (urduSummary) {
        const urAudio = await generateAudio(
          urduSummary,
          "ur-IN",
          "ur-IN-Standard-A"
        );
        if (urAudio) {
          audioUrlUr = await uploadAudio(urAudio, `chemistry/ur/${safeFilename}.mp3`);
          if (audioUrlUr) console.log(`  ✓ Urdu audio uploaded`);
        }
      }

      // 5. Save to Supabase
      const { error: dbError } = urduOnly
        ? await supabase
            .from("topic_content")
            .update({
              urdu_summary: urduSummary || existing?.urdu_summary || null,
              audio_url_ur: audioUrlUr,
              updated_at: new Date().toISOString(),
            })
            .eq("subject", "Chemistry")
            .eq("subtopic", subtopic)
        : await supabase.from("topic_content").upsert(
            {
              subject: "Chemistry",
              chapter_number: chapter.chapter,
              chapter_title: chapter.title,
              section: chapter.section,
              subtopic,
              definition: content?.definition,
              key_points: content?.key_points,
              formulas: content?.formulas,
              worked_example: content?.worked_example,
              exam_tip: content?.exam_tip,
              quick_check: content?.quick_check,
              urdu_summary: urduSummary || null,
              audio_url_en: audioUrlEn,
              audio_url_ur: audioUrlUr,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "subject,subtopic" }
          );

      if (dbError) {
        console.log(`  ✗ Database save failed: ${dbError.message}`);
        failed++;
      } else {
        console.log(`  ✓ Saved to database`);
        success++;
      }

      // Wait between calls to avoid rate limiting
      await sleep(800);
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`Complete: ${success} saved, ${failed} failed, ${total} total`);
  console.log("─────────────────────────────────────────");
}

main().catch(console.error);
