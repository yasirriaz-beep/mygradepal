import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type StudyMode = "crash" | "rapid" | "full";
type Priority = "high" | "medium" | "low";
type SessionMode = "learn" | "practice" | "past_paper";

const CHEMISTRY_TOPICS_BY_PRIORITY = [
  { topic: "Stoichiometry", subtopic: "The Mole and Mole Calculations", priority: "high", days: 3 },
  { topic: "Stoichiometry", subtopic: "Stoichiometric Calculations and Limiting Reactants", priority: "high", days: 2 },
  { topic: "Stoichiometry", subtopic: "Percentage Yield and Purity", priority: "high", days: 2 },
  { topic: "Acids, Bases and Salts", subtopic: "Properties of Acids and Bases", priority: "high", days: 2 },
  { topic: "Acids, Bases and Salts", subtopic: "Preparation of Salts", priority: "high", days: 2 },
  { topic: "Acids, Bases and Salts", subtopic: "Solubility Rules", priority: "high", days: 1 },
  { topic: "Chemical Reactions", subtopic: "Rate of Reaction — Factors", priority: "high", days: 2 },
  { topic: "Chemical Reactions", subtopic: "Collision Theory", priority: "high", days: 2 },
  { topic: "Electrochemistry", subtopic: "Electrolysis — Products at Electrodes", priority: "high", days: 2 },
  { topic: "Electrochemistry", subtopic: "Electroplating", priority: "high", days: 1 },
  { topic: "Atoms, Elements and Compounds", subtopic: "Atomic Structure and Electronic Configuration", priority: "high", days: 2 },
  { topic: "Atoms, Elements and Compounds", subtopic: "Ionic and Covalent Bonding", priority: "high", days: 3 },
  { topic: "Organic Chemistry", subtopic: "Alkanes and Alkenes", priority: "high", days: 2 },
  { topic: "Organic Chemistry", subtopic: "Alcohols and Carboxylic Acids", priority: "high", days: 2 },
  { topic: "Experimental Techniques", subtopic: "Tests for Ions and Gases", priority: "high", days: 2 },
  { topic: "States of Matter", subtopic: "Solids, Liquids and Gases", priority: "medium", days: 1 },
  { topic: "States of Matter", subtopic: "Diffusion", priority: "medium", days: 1 },
  { topic: "Chemical Energetics", subtopic: "Exothermic and Endothermic Reactions", priority: "medium", days: 2 },
  { topic: "Chemical Energetics", subtopic: "Bond Energies and Enthalpy", priority: "medium", days: 2 },
  { topic: "The Periodic Table", subtopic: "Group I and Group VII Properties", priority: "medium", days: 2 },
  { topic: "The Periodic Table", subtopic: "Transition Elements", priority: "medium", days: 1 },
  { topic: "Metals", subtopic: "Reactivity Series", priority: "medium", days: 2 },
  { topic: "Metals", subtopic: "Extraction of Iron and Aluminium", priority: "medium", days: 2 },
  { topic: "Metals", subtopic: "Rusting and Prevention", priority: "medium", days: 1 },
  { topic: "Chemical Reactions", subtopic: "Reversible Reactions and Equilibrium", priority: "medium", days: 2 },
  { topic: "Chemical Reactions", subtopic: "Haber Process", priority: "medium", days: 1 },
  { topic: "Organic Chemistry", subtopic: "Polymers", priority: "medium", days: 2 },
  { topic: "Chemistry of the Environment", subtopic: "Air Pollutants and Climate Change", priority: "medium", days: 2 },
  { topic: "Stoichiometry", subtopic: "Empirical and Molecular Formulae", priority: "low", days: 1 },
  { topic: "Atoms, Elements and Compounds", subtopic: "Isotopes", priority: "low", days: 1 },
  { topic: "Atoms, Elements and Compounds", subtopic: "Giant Covalent Structures", priority: "low", days: 1 },
  { topic: "Electrochemistry", subtopic: "Hydrogen Fuel Cells", priority: "low", days: 1 },
  { topic: "Chemistry of the Environment", subtopic: "Water Treatment and Fertilisers", priority: "low", days: 1 },
  { topic: "Experimental Techniques", subtopic: "Chromatography and Titrations", priority: "low", days: 1 },
  { topic: "Organic Chemistry", subtopic: "Fuels and Fractional Distillation", priority: "low", days: 1 },
] as const satisfies ReadonlyArray<{ topic: string; subtopic: string; priority: Priority; days: number }>;

function getExamDate(session: string, year: number): Date {
  const month = session === "May/June" ? 4 : 9;
  return new Date(year, month, 15);
}

function getDaysUntilExam(session: string, year: number): number {
  const examDate = getExamDate(session, year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStudyMode(daysUntilExam: number): StudyMode {
  if (daysUntilExam <= 28) return "crash";
  if (daysUntilExam <= 60) return "rapid";
  return "full";
}

function selectTopics(mode: StudyMode, targetGrade: string) {
  if (mode === "crash") return CHEMISTRY_TOPICS_BY_PRIORITY.filter((t) => t.priority === "high");
  if (mode === "rapid") {
    if (targetGrade === "C") return CHEMISTRY_TOPICS_BY_PRIORITY.filter((t) => t.priority === "high");
    return CHEMISTRY_TOPICS_BY_PRIORITY.filter((t) => t.priority !== "low");
  }
  if (targetGrade === "C") return CHEMISTRY_TOPICS_BY_PRIORITY.filter((t) => t.priority !== "low");
  return CHEMISTRY_TOPICS_BY_PRIORITY;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentId,
      subject,
      examSession,
      examYear,
      targetGrade,
      studyDaysPerWeek,
      studyMinutesPerDay,
    } = body as {
      studentId?: string;
      subject?: string;
      examSession?: string;
      examYear?: number;
      targetGrade?: string;
      studyDaysPerWeek?: number;
      studyMinutesPerDay?: number;
    };

    if (!studentId || !subject || !examSession || !examYear || !targetGrade) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const daysUntilExam = getDaysUntilExam(examSession, examYear);
    const studyMode = getStudyMode(daysUntilExam);
    const selectedTopics = selectTopics(studyMode, targetGrade);

    await supabase.from("study_plan").delete().eq("student_id", studentId).eq("subject", subject);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const planEntries: Array<{
      student_id: string;
      subject: string;
      topic: string;
      subtopic: string;
      scheduled_date: string;
      week_number: number;
      day_number: number;
      mode: SessionMode;
      priority: Priority;
      completed: boolean;
      minutes_planned: number;
    }> = [];

    let currentDate = new Date(today);
    let topicIndex = 0;
    let dayNumber = 1;
    let weekNumber = 1;
    let remainingDaysForCurrentTopic = selectedTopics[0]?.days ?? 1;

    const examDate = getExamDate(examSession, examYear);

    while (currentDate < examDate && topicIndex < selectedTopics.length) {
      const dayOfWeek = currentDate.getDay();
      const studyDays: Record<number, number[]> = {
        3: [1, 3, 5],
        4: [1, 2, 4, 5],
        5: [1, 2, 3, 4, 5],
        6: [1, 2, 3, 4, 5, 6],
        7: [0, 1, 2, 3, 4, 5, 6],
      };

      const activeDays = studyDays[studyDaysPerWeek ?? 5] ?? studyDays[5];
      const isStudyDay = activeDays.includes(dayOfWeek);

      if (isStudyDay) {
        const currentTopic = selectedTopics[topicIndex];
        let sessionMode: SessionMode = "learn";
        const daysLeft = Math.ceil((examDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (studyMode === "crash") {
          sessionMode = dayNumber % 2 === 0 ? "practice" : "learn";
        } else if (daysLeft <= 14) {
          sessionMode = "past_paper";
        } else if (daysLeft <= 28) {
          sessionMode = dayNumber % 3 === 0 ? "past_paper" : "practice";
        }

        planEntries.push({
          student_id: studentId,
          subject,
          topic: currentTopic.topic,
          subtopic: currentTopic.subtopic,
          scheduled_date: currentDate.toISOString().split("T")[0],
          week_number: weekNumber,
          day_number: dayNumber,
          mode: sessionMode,
          priority: currentTopic.priority,
          completed: false,
          minutes_planned: studyMinutesPerDay ?? 45,
        });

        dayNumber++;
        remainingDaysForCurrentTopic--;

        if (remainingDaysForCurrentTopic <= 0) {
          topicIndex++;
          if (topicIndex < selectedTopics.length) {
            remainingDaysForCurrentTopic = selectedTopics[topicIndex].days;
          }
        }
      }

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() === 1) weekNumber++;
    }

    const twoWeeksBeforeExam = new Date(examDate);
    twoWeeksBeforeExam.setDate(twoWeeksBeforeExam.getDate() - 14);

    let pastPaperDate = new Date(twoWeeksBeforeExam);
    let ppDayNumber = dayNumber;
    let ppWeekNumber = weekNumber;

    while (pastPaperDate < examDate) {
      const dayOfWeek = pastPaperDate.getDay();
      const activeDays = [1, 2, 3, 4, 5];

      if (activeDays.includes(dayOfWeek)) {
        const dateStr = pastPaperDate.toISOString().split("T")[0];
        const alreadyExists = planEntries.find((entry) => entry.scheduled_date === dateStr);

        if (!alreadyExists) {
          planEntries.push({
            student_id: studentId,
            subject,
            topic: "Past Paper Practice",
            subtopic: "Full past paper under timed conditions",
            scheduled_date: dateStr,
            week_number: ppWeekNumber,
            day_number: ppDayNumber,
            mode: "past_paper",
            priority: "high",
            completed: false,
            minutes_planned: studyMinutesPerDay ?? 45,
          });
          ppDayNumber++;
        }
      }

      pastPaperDate = new Date(pastPaperDate);
      pastPaperDate.setDate(pastPaperDate.getDate() + 1);
      if (pastPaperDate.getDay() === 1) ppWeekNumber++;
    }

    if (planEntries.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < planEntries.length; i += batchSize) {
        const batch = planEntries.slice(i, i + batchSize);
        const { error } = await supabase.from("study_plan").insert(batch);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      studyMode,
      daysUntilExam,
      totalSessions: planEntries.length,
      topicsCovered: topicIndex,
      plan: planEntries.slice(0, 7),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
