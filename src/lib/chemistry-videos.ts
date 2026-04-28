const toSeconds = (time: string): number => {
  const [m, s] = time.split(":").map((part) => Number(part));
  return (m || 0) * 60 + (s || 0);
};

export type SubtopicTimestamp = {
  subtopic: string;
  time: string;
  seconds: number;
  end_seconds: number;
};

export type ChemistryVideoEntry = {
  part: number;
  youtube_id: string;
  title: string;
  channel: string;
  summary: string;
  timestamps: { time: string; label: string; seconds: number }[];
  subtopic_timestamps: SubtopicTimestamp[];
};

export type ChemistryChapter = {
  topic: string;
  videos: ChemistryVideoEntry[];
};

const RAW_CHEMISTRY_VIDEOS = [
  { topic: "States of Matter", videos: [{ part: 1, youtube_id: "Wia1om7kwP4", title: "States of Matter — Complete Revision", channel: "IGCSE Study Buddy", summary: "Covers kinetic particle theory, properties of solids/liquids/gases, changes of state, heating curves, gas laws, and diffusion. Mapped to Cambridge 0620 syllabus.", timestamps: [{ time: "0:00", label: "Introduction" }, { time: "1:44", label: "Properties and particle arrangement" }, { time: "3:51", label: "Changes of state" }, { time: "8:16", label: "Heating and cooling curves" }, { time: "10:18", label: "Gas volume and pressure" }, { time: "12:03", label: "Diffusion" }] }] },
  { topic: "Atoms, Elements and Compounds", videos: [{ part: 1, youtube_id: "mGAkJ0b6dGw", title: "Atoms, Elements & Compounds Part 1", channel: "IGCSE Study Buddy", summary: "Covers atomic structure, protons/neutrons/electrons, atomic number, mass number, electron configuration, and isotopes.", timestamps: [{ time: "0:00", label: "Atomic structure" }, { time: "2:30", label: "Atomic number and mass number" }, { time: "5:00", label: "Electron configuration" }, { time: "8:00", label: "Isotopes" }] }, { part: 2, youtube_id: "H27iLlN1CAs", title: "Atoms, Elements & Compounds Part 2 — Bonding", channel: "IGCSE Study Buddy", summary: "Covers ionic bonding, covalent bonding, metallic bonding, and properties of each bond type.", timestamps: [{ time: "0:00", label: "Ionic bonding" }, { time: "4:00", label: "Covalent bonding" }, { time: "8:00", label: "Metallic bonding" }] }] },
  { topic: "Stoichiometry", videos: [{ part: 1, youtube_id: "ibexOm9U2k0", title: "Stoichiometry Part 1 — The Mole", channel: "IGCSE Study Buddy", summary: "Covers relative molecular mass, the mole concept, Avogadro's number, and basic mole calculations.", timestamps: [{ time: "0:00", label: "Relative molecular mass" }, { time: "3:00", label: "The mole" }, { time: "6:00", label: "Moles = mass ÷ Mr" }, { time: "9:00", label: "Worked examples" }] }] },
  { topic: "Electrochemistry", videos: [{ part: 1, youtube_id: "vvbP9xd9CE4", title: "Electrochemistry Part 1", channel: "IGCSE Study Buddy", summary: "Covers electrolysis basics, anode and cathode, electrolysis of water and brine, electrode equations, and electroplating.", timestamps: [{ time: "0:00", label: "Electrolysis setup" }, { time: "2:00", label: "Anode and cathode" }, { time: "4:00", label: "Electrolysis of water" }, { time: "6:00", label: "Electrolysis of brine" }, { time: "8:00", label: "Electroplating" }] }] },
  { topic: "Chemical Energetics", videos: [{ part: 1, youtube_id: "jYKCWKh98ro", title: "Chemical Energetics — Complete Revision", channel: "IGCSE Study Buddy", summary: "Covers exothermic and endothermic reactions, energy profile diagrams, activation energy, bond energies, and energy calculations.", timestamps: [{ time: "0:00", label: "Exothermic reactions" }, { time: "2:00", label: "Endothermic reactions" }, { time: "4:00", label: "Energy profile diagrams" }, { time: "6:00", label: "Bond energies" }, { time: "8:00", label: "Calculations" }] }] },
  { topic: "Chemical Reactions", videos: [{ part: 1, youtube_id: "BTT_ee3xf0g", title: "Chemical Reactions Part 1 — Rate of Reaction", channel: "IGCSE Study Buddy", summary: "Covers rate of reaction, collision theory, factors affecting rate (concentration, temperature, surface area, catalysts), and rate graphs.", timestamps: [{ time: "0:00", label: "Rate of reaction" }, { time: "2:00", label: "Collision theory" }, { time: "4:00", label: "Concentration and temperature" }, { time: "6:00", label: "Surface area and catalysts" }, { time: "8:00", label: "Rate graphs" }] }] },
  { topic: "Acids, Bases and Salts", videos: [{ part: 1, youtube_id: "8QoBtDeREW0", title: "Acids, Bases and Salts Part 1", channel: "IGCSE Study Buddy", summary: "Covers pH scale, indicators, neutralisation, salt preparation methods, and titration procedure.", timestamps: [{ time: "0:00", label: "pH scale" }, { time: "2:00", label: "Indicators" }, { time: "4:00", label: "Neutralisation" }, { time: "6:00", label: "Salt preparation" }, { time: "8:00", label: "Titration" }] }] },
  { topic: "The Periodic Table", videos: [{ part: 1, youtube_id: "OOlqOZvHSbM", title: "The Periodic Table — Complete Revision", channel: "IGCSE Study Buddy", summary: "Covers Group 1 alkali metals, Group 7 halogens, Period 3 trends, and transition metals.", timestamps: [{ time: "0:00", label: "Periodic table overview" }, { time: "2:00", label: "Group 1 properties" }, { time: "4:00", label: "Group 7 properties" }, { time: "6:00", label: "Period 3 trends" }, { time: "8:00", label: "Transition metals" }] }] },
  { topic: "Metals", videos: [{ part: 1, youtube_id: "pgODbLHVVW8", title: "Metals Part 1 — Reactivity Series", channel: "IGCSE Study Buddy", summary: "Covers reactivity series, displacement reactions, extraction of metals, rusting, rust prevention, and alloys.", timestamps: [{ time: "0:00", label: "Reactivity series" }, { time: "2:00", label: "Displacement reactions" }, { time: "4:00", label: "Extraction of metals" }, { time: "6:00", label: "Rusting and prevention" }, { time: "8:00", label: "Alloys" }] }] },
  { topic: "Chemistry of the Environment", videos: [{ part: 1, youtube_id: "nEHxf3Q8D8k", title: "Chemistry of the Environment", channel: "IGCSE Study Buddy", summary: "Covers water treatment, hard water, air pollution, greenhouse effect, global warming, fertilisers, and eutrophication.", timestamps: [{ time: "0:00", label: "Water treatment" }, { time: "2:00", label: "Hard water" }, { time: "4:00", label: "Air pollution" }, { time: "6:00", label: "Greenhouse effect" }, { time: "8:00", label: "Fertilisers and eutrophication" }] }] },
  { topic: "Organic Chemistry", videos: [{ part: 1, youtube_id: "qfzWf-kI1EM", title: "Organic Chemistry Part 1", channel: "IGCSE Study Buddy", summary: "Covers alkanes, alkenes, bromine water test, addition reactions, alcohols, carboxylic acids, esters, and addition polymerisation.", timestamps: [{ time: "0:00", label: "Alkanes" }, { time: "2:00", label: "Alkenes and bromine water test" }, { time: "4:00", label: "Alcohols" }, { time: "6:00", label: "Carboxylic acids" }, { time: "8:00", label: "Esters" }, { time: "10:00", label: "Polymers" }] }] },
  { topic: "Experimental Techniques and Analysis", videos: [{ part: 1, youtube_id: "8gp9f9qC8UU", title: "Experimental Techniques Part 1", channel: "IGCSE Study Buddy", summary: "Covers filtration, evaporation, distillation, chromatography, Rf values, flame tests, ion tests, and gas tests.", timestamps: [{ time: "0:00", label: "Filtration and evaporation" }, { time: "2:00", label: "Distillation" }, { time: "4:00", label: "Chromatography and Rf values" }, { time: "6:00", label: "Flame tests" }, { time: "8:00", label: "Ion and gas tests" }] }] },
] as const;

export const CHEMISTRY_VIDEOS: ChemistryChapter[] = RAW_CHEMISTRY_VIDEOS.map((chapter) => ({
  topic: chapter.topic,
  videos: chapter.videos.map((video) => ({
    ...video,
    timestamps: video.timestamps.map((ts) => ({ ...ts, seconds: toSeconds(ts.time) })),
    subtopic_timestamps: [],
  })),
}));

export const getEmbedUrl = (youtube_id: string, start: number = 0, end: number = 9999): string => {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", start: String(start) });
  if (end < 9999) params.set("end", String(end));
  return `https://www.youtube.com/embed/${youtube_id}?${params.toString()}`;
};

export const findVideoForTopic = (
  subject: string,
  topicParam: string,
): { chapter: ChemistryChapter; video: ChemistryVideoEntry; subtopicMatch: SubtopicTimestamp | null } | null => {
  if (subject !== "Chemistry") return null;
  const topic = topicParam.toLowerCase().trim();
  for (const chapter of CHEMISTRY_VIDEOS) {
    if (topic.includes(chapter.topic.toLowerCase())) {
      return { chapter, video: chapter.videos[0], subtopicMatch: null };
    }
  }
  return null;
};
