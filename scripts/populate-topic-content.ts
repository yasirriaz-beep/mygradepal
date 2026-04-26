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
    title: "States of Matter",
    section: "Physical Chemistry",
    subtopics: [
      "Solids, Liquids and Gases — Properties and Particle Theory",
      "Changes of State — Melting, Boiling, Evaporating, Freezing, Condensing",
      "Effect of Temperature and Pressure on Gas Volume",
      "Diffusion — Definition, Examples and Rate",
    ],
  },
  {
    chapter: 2,
    title: "Atoms, Elements and Compounds",
    section: "Physical Chemistry",
    subtopics: [
      "Elements, Compounds and Mixtures — Differences",
      "Atomic Structure — Nucleus, Protons, Neutrons and Electrons",
      "Proton Number, Mass Number and Electronic Configuration",
      "Isotopes — Definition and Properties",
      "Ions and Ionic Bonds — Formation and Properties",
      "Simple Molecules and Covalent Bonds",
      "Giant Covalent Structures — Diamond and Graphite",
      "Metallic Bonding — Structure and Properties",
    ],
  },
  {
    chapter: 3,
    title: "Stoichiometry",
    section: "Physical Chemistry",
    subtopics: [
      "Chemical Formulae — Molecular and Empirical",
      "Word Equations and Symbol Equations with State Symbols",
      "Relative Atomic Mass and Relative Molecular Mass",
      "The Mole and Avogadro Constant",
      "Mole Calculations — Mass, Volume and Concentration",
      "Stoichiometric Calculations and Limiting Reactants",
      "Percentage Yield, Percentage Composition and Percentage Purity",
    ],
  },
  {
    chapter: 4,
    title: "Electrochemistry",
    section: "Physical Chemistry",
    subtopics: [
      "Electrolysis — Definition, Electrodes and Electrolytes",
      "Products of Electrolysis — Predicting at Anode and Cathode",
      "Electrolysis of Molten Lead Bromide, Sodium Chloride Solution and Sulfuric Acid",
      "Electroplating — Purpose and Process",
      "Hydrogen-Oxygen Fuel Cells",
    ],
  },
  {
    chapter: 5,
    title: "Chemical Energetics",
    section: "Physical Chemistry",
    subtopics: [
      "Exothermic and Endothermic Reactions",
      "Enthalpy Change and Reaction Pathway Diagrams",
      "Activation Energy",
      "Bond Breaking and Bond Making — Energy Changes",
      "Calculating Enthalpy Change Using Bond Energies",
    ],
  },
  {
    chapter: 6,
    title: "Chemical Reactions",
    section: "Physical Chemistry",
    subtopics: [
      "Physical and Chemical Changes",
      "Rate of Reaction — Factors Affecting Rate",
      "Collision Theory — Concentration, Temperature, Surface Area, Catalysts",
      "Measuring Rate of Reaction — Practical Methods",
      "Reversible Reactions and Equilibrium",
      "Haber Process — Conditions and Equation",
      "Contact Process — Conditions and Equation",
      "Redox Reactions — Oxidation and Reduction Definitions",
      "Oxidation Numbers and Identifying Redox Reactions",
      "Oxidising Agents and Reducing Agents",
    ],
  },
  {
    chapter: 7,
    title: "Acids, Bases and Salts",
    section: "Inorganic Chemistry",
    subtopics: [
      "Properties of Acids — Reactions with Metals, Bases and Carbonates",
      "Properties of Bases and Alkalis",
      "pH Scale and Universal Indicator",
      "Strong and Weak Acids",
      "Neutralisation Reactions",
      "Oxides — Acidic, Basic and Amphoteric",
      "Preparation of Soluble Salts",
      "Solubility Rules for Salts",
      "Preparation of Insoluble Salts by Precipitation",
    ],
  },
  {
    chapter: 8,
    title: "The Periodic Table",
    section: "Inorganic Chemistry",
    subtopics: [
      "Arrangement of Elements — Periods, Groups and Atomic Number",
      "Trends Across a Period — Metallic to Non-metallic Character",
      "Group I Alkali Metals — Properties and Trends",
      "Group VII Halogens — Properties, Trends and Displacement Reactions",
      "Group VIII Noble Gases — Properties and Electronic Configuration",
      "Transition Elements — Properties and Uses",
    ],
  },
  {
    chapter: 9,
    title: "Metals",
    section: "Inorganic Chemistry",
    subtopics: [
      "Physical and Chemical Properties of Metals",
      "Uses of Metals — Aluminium and Copper",
      "Alloys — Brass, Stainless Steel and Their Properties",
      "Reactivity Series — Order and Reactions with Water and Acid",
      "Rusting — Conditions and Prevention",
      "Sacrificial Protection and Galvanising",
      "Extraction of Iron in the Blast Furnace",
      "Extraction of Aluminium by Electrolysis",
    ],
  },
  {
    chapter: 10,
    title: "Chemistry of the Environment",
    section: "Inorganic Chemistry",
    subtopics: [
      "Water — Tests for Purity and Treatment of Domestic Supply",
      "Substances in Water — Beneficial and Harmful",
      "Fertilisers — Ammonium Salts, Nitrates and NPK",
      "Composition of Air — Nitrogen, Oxygen and Noble Gases",
      "Air Pollutants — Sources and Harmful Effects",
      "Climate Change — Greenhouse Effect and Global Warming",
      "Acid Rain — Causes and Reduction Strategies",
      "Photosynthesis — Equation and Importance",
    ],
  },
  {
    chapter: 11,
    title: "Organic Chemistry",
    section: "Organic Chemistry",
    subtopics: [
      "Homologous Series — Definition and General Characteristics",
      "Alkanes — Structure, Properties and Combustion",
      "Alkenes — Structure, Properties and Addition Reactions",
      "Cracking of Hydrocarbons",
      "Saturated vs Unsaturated — Bromine Water Test",
      "Alcohols — Manufacture by Fermentation and Hydration",
      "Carboxylic Acids — Reactions and Formation",
      "Esters — Formation from Acids and Alcohols",
      "Addition Polymerisation — Poly(ethene) and Plastics",
      "Condensation Polymerisation — Nylon and Polyesters",
      "Fuels and Fractional Distillation of Petroleum",
      "Environmental Impact of Plastics",
    ],
  },
  {
    chapter: 12,
    title: "Experimental Techniques and Chemical Analysis",
    section: "Practical Chemistry",
    subtopics: [
      "Separation Techniques — Filtration, Crystallisation, Distillation, Chromatography",
      "Purity — Melting Point and Boiling Point Tests",
      "Chromatography — Paper Chromatography and Rf Values",
      "Acid-Base Titrations — Procedure and Calculations",
      "Tests for Anions — Carbonate, Chloride, Bromide, Iodide, Sulfate, Nitrate",
      "Tests for Cations — Using Sodium Hydroxide and Ammonia Solution",
      "Tests for Gases — Ammonia, Carbon Dioxide, Chlorine, Hydrogen, Oxygen, Sulfur Dioxide",
      "Flame Tests — Identifying Metal Ions by Colour",
    ],
  },
];

// ─── Claude: Generate English content ────────────────────────────────────────

const ENGLISH_SYSTEM_PROMPT = `You are a friendly O Level / IGCSE Chemistry tutor explaining topics to 14-16 year old students in Pakistan. You are teaching content from the Cambridge IGCSE Chemistry 0620 syllabus.

Write like a tutor talking to a student — simple, clear and encouraging. NOT like a textbook.
Use local Pakistani examples where helpful (chai, roti, biryani, CNG, petrol, Karachi weather, mobile phones, cooking, etc).
Make sure you cover EVERYTHING Cambridge requires students to know for this specific subtopic.

Respond ONLY with a valid JSON object. No markdown, no backticks, just raw JSON.

{
  "definition": "One friendly sentence explaining what this topic is about. Start with something relatable.",
  "key_points": [
    "Point 1 — include every specific thing Cambridge requires students to know",
    "Point 2 — use simple language but be accurate",
    "Point 3",
    "Point 4",
    "Point 5 (max 6 points)"
  ],
  "formulas": [
    {
      "formula": "Formula in plain text e.g. Moles = Mass divided by Molar Mass",
      "variables": "What each part means in simple words"
    }
  ],
  "worked_example": {
    "question": "A real O Level past paper style question for this specific subtopic",
    "steps": [
      "Step 1: what to do first and why",
      "Step 2: the calculation",
      "Step 3: if needed"
    ],
    "answer": "Final answer with units",
    "takeaway": "One sentence — what should the student remember?"
  },
  "exam_tip": "The one thing students always get wrong in the Cambridge exam for this topic and how to avoid it",
  "quick_check": "One short question to test understanding of this specific subtopic"
}

Rules:
- formulas: empty array [] if subtopic has no equations
- worked_example: null if subtopic is purely conceptual with no calculations
- key_points: cover ALL Cambridge syllabus requirements for this subtopic — check both Core and Supplement content
- Never use LaTeX, markdown, stars, or backticks
- Keep language simple but scientifically accurate`;

// ─── Claude: Generate Urdu summary ───────────────────────────────────────────

const URDU_SYSTEM_PROMPT = `Aap ek Chemistry ke ustaad hain jo Pakistani bachon ko O Level padha rahe hain.

Is topic ka ek chota sa Urdu mein khulasa likhein — 3 se 4 asan jumlay.
Roman Urdu ya Urdu script dono theek hain.
Bilkul simple zaban use karein jaise aap ghar mein baat karte hain.
Koi technical lafz nahi — agar zaruri ho toh English mein likho.
Local misalein dein jaise chai, roti, Karachi ki garmi, CNG wagera.

Sirf text return karein — koi JSON nahi, koi formatting nahi.`;

async function generateEnglishContent(chapter: typeof CHEMISTRY_TOPICS[0], subtopic: string) {
  const buildPrompt = (retry: boolean) => `${retry ? "Your previous output was invalid JSON. " : ""}Generate content for:
Chapter ${chapter.chapter}: ${chapter.title}
Subtopic: ${subtopic}
Section: ${chapter.section}
${retry ? "Return strict JSON only. Ensure all quotes are escaped and every property/value is valid JSON." : ""}`;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
        system: ENGLISH_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: buildPrompt(attempt > 1),
        }],
      });

      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      const clean = text.replace(/```json|```/g, "").trim();
      try {
        return JSON.parse(clean);
      } catch {
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");
        if (start >= 0 && end > start) {
          const extracted = clean.slice(start, end + 1);
          return JSON.parse(extracted);
        }
        throw new Error("No JSON object found in model response");
      }
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await sleep(400);
      }
    }
  }
  throw lastError ?? new Error("Failed to generate valid JSON content.");
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
        .select("urdu_summary, definition, audio_url_en")
        .eq("subject", "Chemistry")
        .eq("subtopic", subtopic)
        .single();

      // Skip if content already has Urdu summary and English audio
      if (existing?.urdu_summary && existing?.audio_url_en) {
        console.log(`  ↷ Skipping — already complete`);
        continue;
      }

      // If row exists but missing some fields, update only what is missing
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

      // 4. Save to Supabase
      const { error: dbError } = urduOnly
        ? await supabase
            .from("topic_content")
            .update({
              urdu_summary: urduSummary || existing?.urdu_summary || null,
              audio_url_en: audioUrlEn ?? existing?.audio_url_en ?? null,
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
