"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/BottomNav";
import { findVideoForTopic } from "@/lib/chemistry-videos";
import { supabase } from "@/lib/supabase";

type ChapterTopic = {
  chapter: number;
  title: string;
  section: string;
  subtopics: string[];
};

const CHEMISTRY_TOPICS: ChapterTopic[] = [
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

const getSubtopicTime = (subject: string, subtopicName: string): string => {
  const result = findVideoForTopic(subject, subtopicName);

  let videoMins = 0;
  if (result?.subtopicMatch) {
    const st = result.subtopicMatch;
    const end = st.end_seconds === 9999
      ? st.seconds + 300 // assume 5 min if no end defined
      : st.end_seconds;
    videoMins = Math.round((end - st.seconds) / 60);
  } else if (result?.video) {
    videoMins = 5; // fallback if chapter match but no subtopic
  }

  // Fixed time for other tabs
  const explainMins = 4;
  const testMins = 7;
  const otherMins = 4; // formulas + example + past paper

  const total = videoMins + explainMins + testMins + otherMins;

  // Round to nearest 5 for cleaner display
  const rounded = Math.ceil(total / 5) * 5;
  return `~${rounded} min`;
};

export default function LearnSubjectPage() {
  const params = useParams<{ subject: string }>();
  const subject = decodeURIComponent(params.subject);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [studiedTopics, setStudiedTopics] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMastery = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let userId = "demo-student";
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user?.id) userId = data.user.id;
        } catch {
          // fall back to demo-student
        }
        const { data, error: scoresError } = await supabase
          .from("topic_scores")
          .select("topic, mastery")
          .eq("student_id", userId)
          .eq("subject", subject);
        if (scoresError) throw new Error(scoresError.message);

        const studied = new Set<string>();
        for (const row of (data ?? []) as Array<Record<string, unknown>>) {
          const topicName = String((row.topic as string) ?? "").trim();
          const mastery = Number((row.mastery as number) ?? 0);
          if (topicName && mastery > 0) studied.add(topicName.toLowerCase());
        }
        setStudiedTopics(studied);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load topics.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadMastery();
  }, [subject]);

  const heading = useMemo(() => `${subject} learning topics`, [subject]);
  const isChemistry = subject.toLowerCase() === "chemistry";
  const chapters = isChemistry ? CHEMISTRY_TOPICS : [];
  const grouped = chapters.reduce((acc, chapter) => {
    if (!acc[chapter.section]) acc[chapter.section] = [];
    acc[chapter.section].push(chapter);
    return acc;
  }, {} as Record<string, ChapterTopic[]>);

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-[#F7F8FA] px-4 pb-24 pt-6 sm:px-6">
      <h1 className="heading-font text-3xl font-bold text-slate-900">{heading}</h1>

      {isLoading && <p className="mt-4 text-sm text-slate-600">Loading topics...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-5 space-y-3">
        {!isChemistry && (
          <article className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">
              Chapter-based ordering is currently configured for Chemistry. Select Chemistry to view textbook chapters.
            </p>
          </article>
        )}
        {isChemistry &&
          Object.entries(grouped).map(([section, sectionChapters]) => (
            <div key={section}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#189080",
                  padding: "20px 0 8px",
                  borderBottom: "2px solid #E8F8F4",
                  marginBottom: 8,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {section}
              </div>
              {sectionChapters.map((chapter) => {
                const chapterKey = `chapter-${chapter.chapter}`;
                const isOpen = expanded[chapterKey] ?? chapter.chapter <= 2;
                return (
                  <article key={chapterKey} className="mb-3 rounded-2xl bg-white p-6 shadow-card">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [chapterKey]: !isOpen }))}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                          style={{ background: "#189080", fontFamily: "'Sora', sans-serif" }}
                        >
                          Ch {chapter.chapter}
                        </span>
                        <p
                          className="text-base font-semibold"
                          style={{ color: "#189080", fontFamily: "'Sora', sans-serif" }}
                        >
                          {chapter.title}
                        </p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "#189080" }}>
                        {isOpen ? "Hide" : "Show"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-1 pl-5">
                        {chapter.subtopics.map((subtopic) => {
                          const studied =
                            studiedTopics.has(subtopic.toLowerCase()) ||
                            studiedTopics.has(chapter.title.toLowerCase());
                          return (
                            <Link
                              key={`${chapterKey}-${subtopic}`}
                              href={`/tutor?subject=Chemistry&topic=${encodeURIComponent(subtopic)}`}
                              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                color: studied ? "#189080" : "#6b7280",
                              }}
                            >
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ background: studied ? "#189080" : "#d1d5db" }}
                              />
                              <span>{subtopic}</span>
                              <span style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                background: "#f3f4f6",
                                borderRadius: 10,
                                padding: "1px 7px",
                                marginLeft: 8,
                                fontWeight: 500,
                                whiteSpace: "nowrap"
                              }}>
                                {getSubtopicTime("Chemistry", subtopic)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ))}
      </section>

      <BottomNav />
    </main>
  );
}
