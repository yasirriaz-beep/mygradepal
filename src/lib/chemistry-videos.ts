// ============================================================
// IGCSE Study Buddy — Cambridge Chemistry 0620
// Complete video library with all parts and subtopic timestamps
// ============================================================

export type SubtopicTimestamp = {
  subtopic: string;
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

export const CHEMISTRY_VIDEOS: ChemistryChapter[] = [

  {
    topic: "States of Matter",
    videos: [
      {
        part: 1,
        youtube_id: "Wia1om7kwP4",
        title: "States of Matter — Complete Revision",
        channel: "IGCSE Study Buddy",
        summary: "Covers kinetic particle theory, properties of solids/liquids/gases, changes of state, heating/cooling curves, gas laws, and diffusion.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                   seconds: 0   },
          { time: "1:44",  label: "Properties and particle theory", seconds: 104 },
          { time: "3:51",  label: "Changes of state",               seconds: 231 },
          { time: "8:16",  label: "Heating and cooling curves",     seconds: 496 },
          { time: "10:18", label: "Gas volume and pressure",        seconds: 618 },
          { time: "12:03", label: "Diffusion",                      seconds: 723 },
        ],
        subtopic_timestamps: []
      }
    ]
  },

  {
    topic: "Atoms, Elements and Compounds",
    videos: [
      {
        part: 1,
        youtube_id: "mGAkJ0b6dGw",
        title: "Atoms, Elements & Compounds Part 1 — Atomic Structure",
        channel: "IGCSE Study Buddy",
        summary: "Elements, compounds, mixtures, atomic structure, protons/neutrons/electrons, atomic number, mass number, electron configuration, isotopes.",
        timestamps: [
          { time: "0:00",  label: "Introduction",              seconds: 0   },
          { time: "1:00",  label: "Elements and compounds",    seconds: 60  },
          { time: "3:00",  label: "Atomic structure",          seconds: 180 },
          { time: "5:30",  label: "Atomic and mass number",    seconds: 330 },
          { time: "8:00",  label: "Electron configuration",    seconds: 480 },
          { time: "11:00", label: "Isotopes",                  seconds: 660 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "H27iLlN1CAs",
        title: "Atoms, Elements & Compounds Part 2 — Ionic Bonding",
        channel: "IGCSE Study Buddy",
        summary: "Ionic bonding, formation of ions, ionic lattice structure, and properties of ionic compounds.",
        timestamps: [
          { time: "0:00", label: "Introduction to bonding",      seconds: 0   },
          { time: "2:00", label: "Ionic bonding",                seconds: 120 },
          { time: "6:00", label: "Ionic lattice and properties", seconds: 360 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 3,
        youtube_id: "w3n90L8xWeI",
        title: "Atoms, Elements & Compounds Part 3 — Covalent Bonding",
        channel: "IGCSE Study Buddy",
        summary: "Covalent bonding, simple molecules, giant covalent structures (diamond and graphite), and their properties.",
        timestamps: [
          { time: "0:00", label: "Covalent bonding intro",       seconds: 0   },
          { time: "3:00", label: "Simple molecules",             seconds: 180 },
          { time: "6:00", label: "Giant covalent structures",    seconds: 360 },
          { time: "9:00", label: "Diamond and graphite",         seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 4,
        youtube_id: "vkRT8Ay1sBM",
        title: "Atoms, Elements & Compounds Part 4 — Metallic Bonding",
        channel: "IGCSE Study Buddy",
        summary: "Metallic bonding, structure of metals, and properties explained by metallic bonding.",
        timestamps: [
          { time: "0:00", label: "Metallic bonding",             seconds: 0   },
          { time: "3:00", label: "Properties of metals",         seconds: 180 },
          { time: "6:00", label: "Comparing bond types",         seconds: 360 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "Stoichiometry",
    videos: [
      {
        part: 1,
        youtube_id: "ibexOm9U2k0",
        title: "Stoichiometry Part 1 — Chemical Formulae and Equations",
        channel: "IGCSE Study Buddy",
        summary: "Chemical formulae, word equations, symbol equations with state symbols, and balancing equations.",
        timestamps: [
          { time: "0:00",  label: "Introduction",           seconds: 0   },
          { time: "2:00",  label: "Chemical formulae",      seconds: 120 },
          { time: "5:00",  label: "Word equations",         seconds: 300 },
          { time: "8:00",  label: "Balancing equations",    seconds: 480 },
          { time: "11:00", label: "State symbols",          seconds: 660 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "G5QSsQXPsaQ",
        title: "Stoichiometry Part 2 — Relative Masses and The Mole",
        channel: "IGCSE Study Buddy",
        summary: "Relative atomic mass, relative molecular mass, mole concept, Avogadro's number, and moles = mass ÷ Mr.",
        timestamps: [
          { time: "0:00",  label: "Introduction",               seconds: 0   },
          { time: "2:00",  label: "Relative atomic mass",       seconds: 120 },
          { time: "5:00",  label: "Relative molecular mass",    seconds: 300 },
          { time: "8:00",  label: "The mole",                   seconds: 480 },
          { time: "11:00", label: "Moles = mass ÷ Mr",          seconds: 660 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 3,
        youtube_id: "tukH7MiXseI",
        title: "Stoichiometry Part 3 — Reacting Masses",
        channel: "IGCSE Study Buddy",
        summary: "Reacting masses from equations, mole ratios, and limiting reactant calculations.",
        timestamps: [
          { time: "0:00", label: "Introduction",                  seconds: 0   },
          { time: "2:00", label: "Mole ratios from equations",    seconds: 120 },
          { time: "5:00", label: "Reacting masses",               seconds: 300 },
          { time: "8:00", label: "Limiting reactants",            seconds: 480 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 4,
        youtube_id: "sYG5p19x2NI",
        title: "Stoichiometry Part 4 — Concentration",
        channel: "IGCSE Study Buddy",
        summary: "Concentration calculations in mol/dm³, converting between mass and moles in solution.",
        timestamps: [
          { time: "0:00", label: "Introduction",                  seconds: 0   },
          { time: "2:00", label: "Concentration",                 seconds: 120 },
          { time: "5:00", label: "mol/dm³ calculations",          seconds: 300 },
          { time: "8:00", label: "Worked examples",               seconds: 480 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 5,
        youtube_id: "xCxMIjq6Xlg",
        title: "Stoichiometry Part 5 — Empirical and Molecular Formula",
        channel: "IGCSE Study Buddy",
        summary: "Empirical formula from percentage composition, molecular formula from empirical formula and Mr.",
        timestamps: [
          { time: "0:00", label: "Introduction",                  seconds: 0   },
          { time: "2:00", label: "Empirical formula",             seconds: 120 },
          { time: "6:00", label: "Molecular formula",             seconds: 360 },
          { time: "9:00", label: "Percentage composition",        seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 6,
        youtube_id: "jRp9Jg9Dc1g",
        title: "Stoichiometry Part 6 — Gas Volumes",
        channel: "IGCSE Study Buddy",
        summary: "Molar volume at RTP (24 dm³/mol), gas volume calculations, and percentage purity.",
        timestamps: [
          { time: "0:00", label: "Introduction",                  seconds: 0   },
          { time: "2:00", label: "Molar volume at RTP",           seconds: 120 },
          { time: "5:00", label: "Gas volume calculations",       seconds: 300 },
          { time: "8:00", label: "Percentage purity",             seconds: 480 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "Electrochemistry",
    videos: [
      {
        part: 1,
        youtube_id: "vvbP9xd9CE4",
        title: "Electrochemistry Part 1 — Electrolysis Basics",
        channel: "IGCSE Study Buddy",
        summary: "Electrolysis setup, anode and cathode, molten electrolytes, and electrode equations.",
        timestamps: [
          { time: "0:00", label: "Introduction",           seconds: 0   },
          { time: "1:30", label: "Electrolysis setup",     seconds: 90  },
          { time: "3:30", label: "Anode and cathode",      seconds: 210 },
          { time: "6:00", label: "Molten electrolytes",    seconds: 360 },
          { time: "9:00", label: "Electrode equations",    seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "BPdP4sYC_Oo",
        title: "Electrochemistry Part 2 — Aqueous Solutions",
        channel: "IGCSE Study Buddy",
        summary: "Electrolysis of water, brine, and copper sulfate. Industrial applications.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                    seconds: 0   },
          { time: "2:00",  label: "Electrolysis of water",           seconds: 120 },
          { time: "5:00",  label: "Electrolysis of brine",           seconds: 300 },
          { time: "8:00",  label: "Copper sulfate electrolysis",     seconds: 480 },
          { time: "11:00", label: "Industrial uses",                 seconds: 660 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 3,
        youtube_id: "pqpeSbLPDgQ",
        title: "Electrochemistry Part 3 — Electroplating and Fuel Cells",
        channel: "IGCSE Study Buddy",
        summary: "Electroplating setup and uses, hydrogen fuel cells, and advantages over combustion engines.",
        timestamps: [
          { time: "0:00", label: "Introduction",                     seconds: 0   },
          { time: "2:00", label: "Electroplating",                   seconds: 120 },
          { time: "6:00", label: "Fuel cells",                       seconds: 360 },
          { time: "9:00", label: "Advantages of fuel cells",         seconds: 540 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "Chemical Energetics",
    videos: [
      {
        part: 1,
        youtube_id: "jYKCWKh98ro",
        title: "Chemical Energetics — Complete Revision",
        channel: "IGCSE Study Buddy",
        summary: "Exothermic and endothermic reactions, energy profile diagrams, activation energy, bond energies, and calculations.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                 seconds: 0   },
          { time: "1:30",  label: "Exothermic reactions",         seconds: 90  },
          { time: "3:30",  label: "Endothermic reactions",        seconds: 210 },
          { time: "5:30",  label: "Energy profile diagrams",      seconds: 330 },
          { time: "7:30",  label: "Activation energy",            seconds: 450 },
          { time: "9:30",  label: "Bond energies",                seconds: 570 },
          { time: "12:00", label: "Bond energy calculations",     seconds: 720 },
        ],
        subtopic_timestamps: []
      }
    ]
  },

  {
    topic: "Chemical Reactions",
    videos: [
      {
        part: 1,
        youtube_id: "BTT_ee3xf0g",
        title: "Chemical Reactions — Rate of Reaction and Equilibrium",
        channel: "IGCSE Study Buddy",
        summary: "Rate of reaction, collision theory, factors affecting rate, rate graphs, reversible reactions, and dynamic equilibrium.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                   seconds: 0   },
          { time: "1:30",  label: "Rate of reaction",               seconds: 90  },
          { time: "3:00",  label: "Collision theory",               seconds: 180 },
          { time: "5:00",  label: "Concentration and temperature",  seconds: 300 },
          { time: "7:00",  label: "Surface area and catalysts",     seconds: 420 },
          { time: "9:00",  label: "Rate graphs",                    seconds: 540 },
          { time: "11:00", label: "Reversible reactions",           seconds: 660 },
          { time: "13:00", label: "Dynamic equilibrium",            seconds: 780 },
        ],
        subtopic_timestamps: []
      }
    ]
  },

  {
    topic: "Acids, Bases and Salts",
    videos: [
      {
        part: 1,
        youtube_id: "8QoBtDeREW0",
        title: "Acids, Bases and Salts Part 1 — Properties and pH",
        channel: "IGCSE Study Buddy",
        summary: "Characteristic properties of acids and bases, pH scale, indicators, strong vs weak acids.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                   seconds: 0   },
          { time: "1:30",  label: "pH scale",                       seconds: 90  },
          { time: "3:00",  label: "Indicators",                     seconds: 180 },
          { time: "5:00",  label: "Acids and their reactions",      seconds: 300 },
          { time: "7:30",  label: "Bases and alkalis",              seconds: 450 },
          { time: "10:00", label: "Strong and weak acids",          seconds: 600 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "OOsWwmejp0I",
        title: "Acids, Bases and Salts Part 2 — Neutralisation and Salts",
        channel: "IGCSE Study Buddy",
        summary: "Neutralisation reactions, preparation of soluble salts, and titration procedure.",
        timestamps: [
          { time: "0:00", label: "Introduction",                    seconds: 0   },
          { time: "2:00", label: "Neutralisation",                  seconds: 120 },
          { time: "4:00", label: "Salt preparation methods",        seconds: 240 },
          { time: "8:00", label: "Titration",                       seconds: 480 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 3,
        youtube_id: "HJNkOarDgEg",
        title: "Acids, Bases and Salts Part 3 — Insoluble Salts and Oxides",
        channel: "IGCSE Study Buddy",
        summary: "Preparation of insoluble salts by precipitation, types of oxides, and solubility rules.",
        timestamps: [
          { time: "0:00", label: "Introduction",                    seconds: 0   },
          { time: "2:00", label: "Insoluble salts",                 seconds: 120 },
          { time: "5:00", label: "Solubility rules",                seconds: 300 },
          { time: "8:00", label: "Types of oxides",                 seconds: 480 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "The Periodic Table",
    videos: [
      {
        part: 1,
        youtube_id: "OOlqOZvHSbM",
        title: "The Periodic Table Part 1 — Group 1 and Group 7",
        channel: "IGCSE Study Buddy",
        summary: "Group 1 alkali metals (reactivity trends), Group 7 halogens (properties and displacement reactions).",
        timestamps: [
          { time: "0:00",  label: "Periodic table overview",        seconds: 0   },
          { time: "2:00",  label: "Group 1 alkali metals",          seconds: 120 },
          { time: "5:30",  label: "Group 1 reactivity trends",      seconds: 330 },
          { time: "8:00",  label: "Group 7 halogens",               seconds: 480 },
          { time: "11:00", label: "Halogen displacement reactions", seconds: 660 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "LJc_AzJ8hps",
        title: "The Periodic Table Part 2 — Period 3 and Transition Metals",
        channel: "IGCSE Study Buddy",
        summary: "Period 3 trends, transition metals properties, coloured compounds, catalytic activity.",
        timestamps: [
          { time: "0:00", label: "Introduction",                    seconds: 0   },
          { time: "2:00", label: "Period 3 trends",                 seconds: 120 },
          { time: "6:00", label: "Transition metals",               seconds: 360 },
          { time: "9:00", label: "Properties of transition metals", seconds: 540 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "Metals",
    videos: [
      {
        part: 1,
        youtube_id: "pgODbLHVVW8",
        title: "Metals Part 1 — Reactivity Series",
        channel: "IGCSE Study Buddy",
        summary: "Reactivity series, reactions of metals with water and acids, displacement reactions.",
        timestamps: [
          { time: "0:00", label: "Introduction",                    seconds: 0   },
          { time: "1:30", label: "Reactivity series",               seconds: 90  },
          { time: "4:00", label: "Reactions with water",            seconds: 240 },
          { time: "6:00", label: "Reactions with acids",            seconds: 360 },
          { time: "8:00", label: "Displacement reactions",          seconds: 480 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "D0bf2_k7SPU",
        title: "Metals Part 2 — Extraction of Metals",
        channel: "IGCSE Study Buddy",
        summary: "Extraction by carbon reduction (blast furnace for iron) and electrolysis (aluminium).",
        timestamps: [
          { time: "0:00",  label: "Introduction",                   seconds: 0   },
          { time: "2:00",  label: "Extraction principles",          seconds: 120 },
          { time: "4:00",  label: "Blast furnace — iron",           seconds: 240 },
          { time: "8:00",  label: "Aluminium extraction",           seconds: 480 },
          { time: "11:00", label: "Recycling metals",               seconds: 660 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 3,
        youtube_id: "QvVXxR05yUE",
        title: "Metals Part 3 — Rusting and Alloys",
        channel: "IGCSE Study Buddy",
        summary: "Rusting conditions, rust prevention (sacrificial protection, galvanising), and alloys.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                   seconds: 0   },
          { time: "2:00",  label: "Rusting conditions",             seconds: 120 },
          { time: "5:00",  label: "Rust prevention",                seconds: 300 },
          { time: "8:00",  label: "Sacrificial protection",         seconds: 480 },
          { time: "10:00", label: "Alloys",                         seconds: 600 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "Chemistry of the Environment",
    videos: [
      {
        part: 1,
        youtube_id: "nEHxf3Q8D8k",
        title: "Chemistry of the Environment — Complete Revision",
        channel: "IGCSE Study Buddy",
        summary: "Water treatment, hard water, air pollution, acid rain, greenhouse effect, fertilisers, eutrophication.",
        timestamps: [
          { time: "0:00",  label: "Introduction",          seconds: 0   },
          { time: "1:30",  label: "Water treatment",       seconds: 90  },
          { time: "3:30",  label: "Hard water",            seconds: 210 },
          { time: "5:30",  label: "Air pollution",         seconds: 330 },
          { time: "7:30",  label: "Acid rain",             seconds: 450 },
          { time: "9:00",  label: "Greenhouse effect",     seconds: 540 },
          { time: "11:00", label: "Fertilisers",           seconds: 660 },
          { time: "13:00", label: "Eutrophication",        seconds: 780 },
        ],
        subtopic_timestamps: []
      }
    ]
  },

  {
    topic: "Organic Chemistry",
    videos: [
      {
        part: 1,
        youtube_id: "qfzWf-kI1EM",
        title: "Organic Chemistry Part 1 — Alkanes",
        channel: "IGCSE Study Buddy",
        summary: "Introduction to organic chemistry, homologous series, naming, alkanes, combustion, and cracking.",
        timestamps: [
          { time: "0:00", label: "Introduction",           seconds: 0   },
          { time: "2:00", label: "Homologous series",      seconds: 120 },
          { time: "4:00", label: "Naming compounds",       seconds: 240 },
          { time: "6:00", label: "Alkanes structure",      seconds: 360 },
          { time: "9:00", label: "Combustion and cracking",seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 2,
        youtube_id: "EHNbgS7fFxk",
        title: "Organic Chemistry Part 2 — Alkenes",
        channel: "IGCSE Study Buddy",
        summary: "Alkenes, bromine water test, addition reactions, and addition polymerisation.",
        timestamps: [
          { time: "0:00", label: "Introduction",           seconds: 0   },
          { time: "2:00", label: "Alkenes structure",      seconds: 120 },
          { time: "4:00", label: "Bromine water test",     seconds: 240 },
          { time: "6:00", label: "Addition reactions",     seconds: 360 },
          { time: "9:00", label: "Addition polymerisation",seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 3,
        youtube_id: "9pJM6V7SMX4",
        title: "Organic Chemistry Part 3 — Alcohols",
        channel: "IGCSE Study Buddy",
        summary: "Alcohols, fermentation, oxidation to carboxylic acids, and uses of ethanol.",
        timestamps: [
          { time: "0:00", label: "Introduction",           seconds: 0   },
          { time: "2:00", label: "Alcohols structure",     seconds: 120 },
          { time: "4:00", label: "Fermentation",           seconds: 240 },
          { time: "7:00", label: "Oxidation of alcohols",  seconds: 420 },
          { time: "9:00", label: "Uses of ethanol",        seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 4,
        youtube_id: "fcjghanVhNs",
        title: "Organic Chemistry Part 4 — Carboxylic Acids",
        channel: "IGCSE Study Buddy",
        summary: "Carboxylic acids, ethanoic acid, reactions with metals/bases/carbonates, weak acid behaviour.",
        timestamps: [
          { time: "0:00", label: "Introduction",           seconds: 0   },
          { time: "2:00", label: "Carboxylic acids",       seconds: 120 },
          { time: "4:00", label: "Properties and reactions",seconds: 240 },
          { time: "7:00", label: "Weak acid behaviour",    seconds: 420 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 5,
        youtube_id: "zeikD0TyBy8",
        title: "Organic Chemistry Part 5 — Esters",
        channel: "IGCSE Study Buddy",
        summary: "Esters, esterification, naming esters, and uses.",
        timestamps: [
          { time: "0:00", label: "Introduction",           seconds: 0   },
          { time: "2:00", label: "Esters formation",       seconds: 120 },
          { time: "5:00", label: "Naming esters",          seconds: 300 },
          { time: "7:00", label: "Uses of esters",         seconds: 420 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 6,
        youtube_id: "PoWFcGXv4fU",
        title: "Organic Chemistry Part 6 — Condensation Polymers",
        channel: "IGCSE Study Buddy",
        summary: "Condensation polymerisation, nylon, polyesters, and environmental issues with plastics.",
        timestamps: [
          { time: "0:00", label: "Introduction",             seconds: 0   },
          { time: "2:00", label: "Condensation polymers",    seconds: 120 },
          { time: "5:00", label: "Nylon",                    seconds: 300 },
          { time: "7:00", label: "Polyesters",               seconds: 420 },
          { time: "9:00", label: "Environmental issues",     seconds: 540 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 7,
        youtube_id: "6L8VRqFruFw",
        title: "Organic Chemistry Part 7 — Fats and Oils",
        channel: "IGCSE Study Buddy",
        summary: "Fats and oils, saturated vs unsaturated, hydrogenation of vegetable oils, soap making.",
        timestamps: [
          { time: "0:00", label: "Introduction",             seconds: 0   },
          { time: "2:00", label: "Fats and oils structure",  seconds: 120 },
          { time: "4:00", label: "Saturated vs unsaturated", seconds: 240 },
          { time: "6:00", label: "Hydrogenation of oils",    seconds: 360 },
          { time: "8:00", label: "Soap making",              seconds: 480 },
        ],
        subtopic_timestamps: []
      },
      {
        part: 8,
        youtube_id: "Bsh8lgt_B_I",
        title: "Organic Chemistry Part 8 — Amino Acids and Proteins",
        channel: "IGCSE Study Buddy",
        summary: "Amino acids, peptide bonds, protein structure, and hydrolysis of proteins.",
        timestamps: [
          { time: "0:00", label: "Introduction",             seconds: 0   },
          { time: "2:00", label: "Amino acids",              seconds: 120 },
          { time: "5:00", label: "Peptide bonds",            seconds: 300 },
          { time: "7:00", label: "Proteins",                 seconds: 420 },
          { time: "9:00", label: "Hydrolysis",               seconds: 540 },
        ],
        subtopic_timestamps: []
      },
    ]
  },

  {
    topic: "Experimental Techniques and Analysis",
    videos: [
      {
        part: 1,
        youtube_id: "8gp9f9qC8UU",
        title: "Experimental Techniques — Paper 6 Complete Revision",
        channel: "IGCSE Study Buddy",
        summary: "Filtration, evaporation, crystallisation, distillation, chromatography, Rf values, flame tests, ion tests, gas tests.",
        timestamps: [
          { time: "0:00",  label: "Introduction",                   seconds: 0   },
          { time: "1:30",  label: "Filtration and evaporation",     seconds: 90  },
          { time: "3:30",  label: "Distillation",                   seconds: 210 },
          { time: "5:30",  label: "Chromatography",                 seconds: 330 },
          { time: "7:30",  label: "Rf values",                      seconds: 450 },
          { time: "9:00",  label: "Flame tests",                    seconds: 540 },
          { time: "11:00", label: "Ion tests",                      seconds: 660 },
          { time: "13:00", label: "Gas tests",                      seconds: 780 },
        ],
        subtopic_timestamps: []
      }
    ]
  },

];

export const getEmbedUrl = (
  youtube_id: string,
  start: number = 0,
  end: number = 9999
): string => {
  const params: Record<string, string> = {
    rel: "0",
    modestbranding: "1",
    start: String(start),
  };
  if (end < 9999) params.end = String(end);
  return `https://www.youtube.com/embed/${youtube_id}?${new URLSearchParams(params).toString()}`;
};

export const findVideoForTopic = (
  subject: string,
  topicParam: string
): { chapter: ChemistryChapter; video: ChemistryVideoEntry; subtopicMatch: SubtopicTimestamp | null } | null => {
  if (subject !== "Chemistry") return null;
  const topic = topicParam.toLowerCase().trim();

  for (const chapter of CHEMISTRY_VIDEOS) {
    for (const video of chapter.videos) {
      for (const st of video.subtopic_timestamps ?? []) {
        if (
          topic.includes(st.subtopic.toLowerCase()) ||
          st.subtopic.toLowerCase().split(" ").filter(w => w.length > 3).every(w => topic.includes(w))
        ) {
          return { chapter, video, subtopicMatch: st };
        }
      }
    }
  }

  const keywordMap: [string, string][] = [
    ["solid","States of Matter"],["liquid","States of Matter"],["gas","States of Matter"],
    ["diffusion","States of Matter"],["melting","States of Matter"],["boiling","States of Matter"],
    ["evaporat","States of Matter"],["heating curve","States of Matter"],["kinetic","States of Matter"],
    ["atom","Atoms, Elements and Compounds"],["electron","Atoms, Elements and Compounds"],
    ["isotope","Atoms, Elements and Compounds"],["ionic bond","Atoms, Elements and Compounds"],
    ["covalent","Atoms, Elements and Compounds"],["metallic bond","Atoms, Elements and Compounds"],
    ["proton","Atoms, Elements and Compounds"],["neutron","Atoms, Elements and Compounds"],
    ["diamond","Atoms, Elements and Compounds"],["graphite","Atoms, Elements and Compounds"],
    ["mole","Stoichiometry"],["stoich","Stoichiometry"],["empirical","Stoichiometry"],
    ["concentration","Stoichiometry"],["reacting mass","Stoichiometry"],
    ["balancing","Stoichiometry"],["avogadro","Stoichiometry"],
    ["electrolysis","Electrochemistry"],["electroplat","Electrochemistry"],
    ["fuel cell","Electrochemistry"],["anode","Electrochemistry"],["cathode","Electrochemistry"],
    ["exothermic","Chemical Energetics"],["endothermic","Chemical Energetics"],
    ["bond energy","Chemical Energetics"],["activation energy","Chemical Energetics"],
    ["rate of reaction","Chemical Reactions"],["collision theory","Chemical Reactions"],
    ["equilibrium","Chemical Reactions"],["reversible","Chemical Reactions"],
    ["catalyst","Chemical Reactions"],
    ["acid","Acids, Bases and Salts"],["alkali","Acids, Bases and Salts"],
    ["neutrali","Acids, Bases and Salts"],["titration","Acids, Bases and Salts"],
    ["group 1","The Periodic Table"],["group 7","The Periodic Table"],
    ["halogen","The Periodic Table"],["transition metal","The Periodic Table"],
    ["period 3","The Periodic Table"],["periodic table","The Periodic Table"],
    ["reactivity series","Metals"],["blast furnace","Metals"],
    ["rusting","Metals"],["alloy","Metals"],["extraction of metal","Metals"],
    ["water treatment","Chemistry of the Environment"],
    ["hard water","Chemistry of the Environment"],
    ["greenhouse","Chemistry of the Environment"],
    ["eutrophication","Chemistry of the Environment"],
    ["fertiliser","Chemistry of the Environment"],
    ["acid rain","Chemistry of the Environment"],
    ["alkane","Organic Chemistry"],["alkene","Organic Chemistry"],
    ["alcohol","Organic Chemistry"],["ester","Organic Chemistry"],
    ["polymer","Organic Chemistry"],["fermentation","Organic Chemistry"],
    ["carboxylic","Organic Chemistry"],["amino acid","Organic Chemistry"],
    ["organic","Organic Chemistry"],["crude oil","Organic Chemistry"],
    ["filtration","Experimental Techniques and Analysis"],
    ["distillation","Experimental Techniques and Analysis"],
    ["chromatography","Experimental Techniques and Analysis"],
    ["flame test","Experimental Techniques and Analysis"],
    ["rf value","Experimental Techniques and Analysis"],
    ["experimental","Experimental Techniques and Analysis"],
    ["qualitative analysis","Experimental Techniques and Analysis"],
  ];

  for (const [keyword, chapterName] of keywordMap) {
    if (topic.includes(keyword)) {
      const chapter = CHEMISTRY_VIDEOS.find(c => c.topic === chapterName);
      if (chapter) return { chapter, video: chapter.videos[0], subtopicMatch: null };
    }
  }

  return null;
};
