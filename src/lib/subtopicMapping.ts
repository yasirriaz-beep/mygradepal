const SUBTOPIC_MAP: Record<string, string> = {
  // States of Matter
  "Solids, Liquids and Gases — Properties and Particle Theory": "Kinetic Particle Theory",
  "Changes of State — Melting, Boiling, Evaporating, Freezing, Condensing": "Changes of State",
  "Effect of Temperature and Pressure on Gas Volume": "Gas Laws",
  "Diffusion — Definition, Examples and Rate": "Diffusion",

  // Atoms Elements and Compounds
  "Elements, Compounds and Mixtures — Differences": "Elements Compounds and Mixtures",
  "Atomic Structure — Nucleus, Protons, Neutrons and Electrons": "Atomic Structure",
  "Proton Number, Mass Number and Electronic Configuration": "Electronic Configuration",
  "Isotopes — Definition and Properties": "Isotopes",
  "Ions and Ionic Bonds — Formation and Properties": "Ionic Bonding",
  "Simple Molecules and Covalent Bonds": "Covalent Bonding",
  "Giant Covalent Structures — Diamond and Graphite": "Giant Covalent Structures",
  "Metallic Bonding — Structure and Properties": "Metallic Bonding",

  // Stoichiometry
  "Chemical Formulae — Molecular and Empirical": "Empirical Formula",
  "Word Equations and Symbol Equations with State Symbols": "Balancing Equations",
  "Relative Atomic Mass and Relative Molecular Mass": "Mole Calculations",
  "The Mole and Avogadro Constant": "Mole Calculations",
  "Mole Calculations — Mass, Volume and Concentration": "Mole Calculations",
  "Stoichiometric Calculations and Limiting Reactants": "Mole Calculations",
  "Percentage Yield, Percentage Composition and Percentage Purity": "Empirical Formula",

  // Electrochemistry
  "Electrolysis — Definition, Electrodes and Electrolytes": "Electrolysis",
  "Products of Electrolysis — Predicting at Anode and Cathode": "Electrode Reactions",
  "Electrolysis of Molten Lead Bromide, Sodium Chloride Solution and Sulfuric Acid": "Electrolysis",
  "Electroplating — Purpose and Process": "Electroplating",
  "Hydrogen-Oxygen Fuel Cells": "Fuel Cells",

  // Chemical Energetics
  "Exothermic and Endothermic Reactions": "Exothermic and Endothermic Reactions",
  "Enthalpy Change and Reaction Pathway Diagrams": "Energy Level Diagrams",
  "Activation Energy": "Energy Level Diagrams",
  "Bond Breaking and Bond Making — Energy Changes": "Bond Energy Calculations",
  "Calculating Enthalpy Change Using Bond Energies": "Bond Energy Calculations",

  // Chemical Reactions
  "Physical and Chemical Changes": "Physical and Chemical Changes",
  "Rate of Reaction — Factors Affecting Rate": "Rate of Reaction",
  "Collision Theory — Concentration, Temperature, Surface Area, Catalysts": "Collision Theory",
  "Measuring Rate of Reaction — Practical Methods": "Rate of Reaction",
  "Reversible Reactions and Equilibrium": "Reversible Reactions and Equilibrium",
  "Haber Process — Conditions and Equation": "Industrial Processes",
  "Contact Process — Conditions and Equation": "Industrial Processes",
  "Redox Reactions — Oxidation and Reduction Definitions": "Redox Reactions",
  "Oxidation Numbers and Identifying Redox Reactions": "Redox Reactions",
  "Oxidising Agents and Reducing Agents": "Redox Reactions",

  // Acids Bases and Salts
  "Properties of Acids — Reactions with Metals, Bases and Carbonates": "Properties and Reactions of Acids",
  "Properties of Bases and Alkalis": "Definitions of Acids and Bases",
  "pH Scale and Universal Indicator": "Indicators and pH",
  "Strong and Weak Acids": "Strong and Weak Acids",
  "Neutralisation Reactions": "Neutralisation",
  "Oxides — Acidic, Basic and Amphoteric": "Oxides",
  "Preparation of Soluble Salts": "Preparation of Salts",
  "Solubility Rules for Salts": "Preparation of Salts",
  "Preparation of Insoluble Salts by Precipitation": "Precipitation Reactions",

  // The Periodic Table
  "Arrangement of Elements — Periods, Groups and Atomic Number": "Period Trends",
  "Trends Across a Period — Metallic to Non-metallic Character": "Period Trends",
  "Group I Alkali Metals — Properties and Trends": "Group I Alkali Metals",
  "Group VII Halogens — Properties, Trends and Displacement Reactions": "Group VII Halogens",
  "Group VIII Noble Gases — Properties and Electronic Configuration": "Noble Gases",
  "Transition Elements — Properties and Uses": "Transition Metals",

  // Metals
  "Physical and Chemical Properties of Metals": "Properties of Metals",
  "Uses of Metals — Aluminium and Copper": "Properties of Metals",
  "Alloys — Brass, Stainless Steel and Their Properties": "Alloys",
  "Reactivity Series — Order and Reactions with Water and Acid": "Reactivity Series",
  "Rusting — Conditions and Prevention": "Corrosion and Rusting",
  "Sacrificial Protection and Galvanising": "Corrosion and Rusting",
  "Extraction of Iron in the Blast Furnace": "Extraction of Metals",
  "Extraction of Aluminium by Electrolysis": "Electrolysis of Aluminium",

  // Air and Water
  "Water — Tests for Purity and Treatment of Domestic Supply": "Water Treatment",
  "Substances in Water — Beneficial and Harmful": "Water Treatment",
  "Fertilisers — Ammonium Salts, Nitrates and NPK": "Fertilisers",
  "Composition of Air — Nitrogen, Oxygen and Noble Gases": "Composition of Air",
  "Air Pollutants — Sources and Harmful Effects": "Air Pollution",
  "Climate Change — Greenhouse Effect and Global Warming": "Greenhouse Effect and Carbon Cycle",
  "Acid Rain — Causes and Reduction Strategies": "Air Pollution",
  "Photosynthesis — Equation and Importance": "Greenhouse Effect and Carbon Cycle",

  // Organic Chemistry
  "Homologous Series — Definition and General Characteristics": "Homologous Series",
  "Alkanes — Structure, Properties and Combustion": "Alkanes",
  "Alkenes — Structure, Properties and Addition Reactions": "Alkenes",
  "Cracking of Hydrocarbons": "Petroleum and Fuels",
  "Saturated vs Unsaturated — Bromine Water Test": "Alkenes",
  "Alcohols — Manufacture by Fermentation and Hydration": "Alcohols",
  "Carboxylic Acids — Reactions and Formation": "Carboxylic Acids",
  "Esters — Formation from Acids and Alcohols": "Esters",
  "Addition Polymerisation — Poly(ethene) and Plastics": "Polymers",
  "Condensation Polymerisation — Nylon and Polyesters": "Polymers",
  "Fuels and Fractional Distillation of Petroleum": "Petroleum and Fuels",
  "Environmental Impact of Plastics": "Polymers",

  // Experimental Techniques
  "Separation Techniques — Filtration, Crystallisation, Distillation, Chromatography": "Separation Techniques",
  "Purity — Melting Point and Boiling Point Tests": "Measuring and Apparatus",
  "Chromatography — Paper Chromatography and Rf Values": "Chromatography",
  "Acid-Base Titrations — Procedure and Calculations": "Titration",
  "Tests for Anions — Carbonate, Chloride, Bromide, Iodide, Sulfate, Nitrate": "Chemical Tests",
  "Tests for Cations — Using Sodium Hydroxide and Ammonia Solution": "Chemical Tests",
  "Tests for Gases — Ammonia, Carbon Dioxide, Chlorine, Hydrogen, Oxygen, Sulfur Dioxide": "Chemical Tests",
  "Flame Tests — Identifying Metal Ions by Colour": "Chemical Tests",
};

export function getDbSubtopic(learnPageName: string): string {
  return SUBTOPIC_MAP[learnPageName] ?? learnPageName;
}
