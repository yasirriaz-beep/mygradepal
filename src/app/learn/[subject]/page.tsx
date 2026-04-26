"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/BottomNav";
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
    subtopics: ["How Are Solids, Liquids and Gases Different?", "How Do Particles Move?"],
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
    subtopics: ["Why Do Atoms Combine?", "What Is Ionic Bonding?", "What Is Covalent Bonding?", "What Is Metallic Bonding?"],
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
    subtopics: ["What Are Salts?", "How Are Salts Prepared?"],
  },
  {
    chapter: 10,
    title: "Ammonia",
    section: "Chemical Reactions",
    subtopics: ["How Can Ammonia Be Made?", "What Are Some Reversible Reactions?"],
  },
  {
    chapter: 11,
    title: "Qualitative Analysis",
    section: "Chemical Reactions",
    subtopics: ["How Do We Test for Cations?", "How Do We Test for Anions?", "How Do We Test for Gases?"],
  },
  {
    chapter: 12,
    title: "Oxidation and Reduction",
    section: "Chemical Reactions",
    subtopics: ["What Are Oxidation and Reduction?", "How Do We Identify and Analyse Redox Reactions?"],
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
    subtopics: ["What Is Enthalpy Change?", "How Do We Calculate Enthalpy Changes?"],
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
    subtopics: ["What Are Alcohols?", "What Are Carboxylic Acids?", "What Are Esters?"],
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <h1 className="heading-font text-3xl font-bold text-slate-900">{heading}</h1>

      {isLoading && <p className="mt-4 text-sm text-slate-600">Loading topics...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-5 space-y-3">
        {!isChemistry && (
          <article className="rounded-2xl bg-white p-5 shadow-card">
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
                  <article key={chapterKey} className="mb-3 rounded-2xl bg-white p-4 shadow-card">
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
