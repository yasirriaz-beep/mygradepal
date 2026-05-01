"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TOPIC_HOURS = [
  { topic: "Organic Chemistry", hours: 22 },
  { topic: "Atoms Elements and Compounds", hours: 18 },
  { topic: "Acids Bases and Salts", hours: 17 },
  { topic: "Chemical Reactions", hours: 16 },
  { topic: "Metals", hours: 14 },
  { topic: "The Periodic Table", hours: 11 },
  { topic: "Air and Water", hours: 11 },
  { topic: "Electrochemistry", hours: 11 },
  { topic: "Stoichiometry", hours: 13 },
  { topic: "Experimental Techniques", hours: 9 },
  { topic: "Chemical Energetics", hours: 9 },
  { topic: "States of Matter", hours: 7 },
] as const;

const PASS_DEFINITIONS = [
  {
    id: 1,
    name: "Learn",
    ratio: 0.5,
    description: "First time through - take your time, understand every concept deeply",
    color: "teal",
  },
  {
    id: 2,
    name: "Practice",
    ratio: 0.3,
    description: "Second time - faster now, focus on past papers and weak spots",
    color: "orange",
  },
  {
    id: 3,
    name: "Master",
    ratio: 0.2,
    description: "Third time - quick revision, full past papers under exam conditions",
    color: "green",
  },
] as const;

const TOPIC_COLORS = [
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "bg-sky-100 text-sky-800 border-sky-200",
] as const;

const TOPIC_SCHEDULE = [
  { startWeek: 1, endWeek: 2, topic: "Organic Chemistry", subtopic: "Core concepts and high-frequency patterns" },
  { startWeek: 3, endWeek: 4, topic: "Atoms & Compounds", subtopic: "Structure, bonding, and formula practice" },
  { startWeek: 5, endWeek: 6, topic: "Acids, Bases & Salts", subtopic: "Reactions, indicators, and equations" },
  { startWeek: 7, endWeek: 8, topic: "Chemical Reactions", subtopic: "Balancing, rates, and reaction types" },
  { startWeek: 9, endWeek: 10, topic: "Metals + Periodic Table", subtopic: "Trends, extraction, and properties" },
  { startWeek: 11, endWeek: 12, topic: "Electrochemistry + Stoichiometry", subtopic: "Calculations and electrolysis" },
  { startWeek: 13, endWeek: 14, topic: "Remaining topics", subtopic: "Air, Water, Energetics, and States" },
  { startWeek: 15, endWeek: Number.POSITIVE_INFINITY, topic: "Past papers + revision", subtopic: "Timed papers and weak-topic fixes" },
];

type Tier = 1 | 2 | 3 | 4;
const TIER_TOTAL_HOURS: Record<Tier, number> = {
  1: 420,
  2: 280,
  3: 141,
  4: 70,
};

function getExamDate(session: string, year: number): Date {
  const month = session === "May/June" ? 4 : 9;
  return new Date(year, month, 15);
}

function getTier(daysRemaining: number): Tier {
  if (daysRemaining >= 700) return 1;
  if (daysRemaining >= 180) return 2;
  if (daysRemaining >= 60) return 3;
  return 4;
}

function StudyPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session") ?? "May/June";
  const examYear = Number(searchParams.get("examYear") ?? "2027");
  const daysPerWeek = parseInt(searchParams.get("daysPerWeek") ?? "5", 10);
  const targetGrade = searchParams.get("targetGrade") ?? "A";

  console.log("study-plan params:", { session, examYear, daysPerWeek, targetGrade });

  const examDate = useMemo(() => getExamDate(session, examYear), [session, examYear]);
  const daysRemaining = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / 86400000));
  }, [examDate]);
  const tier = useMemo(() => getTier(daysRemaining), [daysRemaining]);
  const totalStudyHours = TIER_TOTAL_HOURS[tier];
  const dailyHours = useMemo(() => {
    if (daysRemaining <= 0) return 4;
    const raw = (totalStudyHours / daysRemaining / Math.max(daysPerWeek, 1)) * 7;
    return Math.min(4, Math.max(1, Number(raw.toFixed(1))));
  }, [daysRemaining, daysPerWeek, totalStudyHours]);
  const weeksUntilExam = useMemo(() => Math.max(1, Math.ceil(daysRemaining / 7)), [daysRemaining]);

  const passPlan = useMemo(() => {
    const totalWeeks = Math.max(weeksUntilExam, 1);
    let weekCursor = 1;
    return PASS_DEFINITIONS.map((pass, index) => {
      const passHours = Math.round(totalStudyHours * pass.ratio);
      const passWeeks =
        index === PASS_DEFINITIONS.length - 1
          ? Math.max(1, totalWeeks - (weekCursor - 1))
          : Math.max(1, Math.round(totalWeeks * pass.ratio));
      const startWeek = weekCursor;
      const endWeek = Math.min(totalWeeks, startWeek + passWeeks - 1);
      weekCursor = endWeek + 1;
      return {
        ...pass,
        passHours,
        startWeek,
        endWeek,
        barWidth: pass.id === 1 ? "100%" : pass.id === 2 ? "60%" : "40%",
      };
    });
  }, [totalStudyHours, weeksUntilExam]);

  const dailyCalendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = 30;
    const dates = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    const isStudyDay = (date: Date) => {
      const mondayBased = (date.getDay() + 6) % 7;
      if (daysPerWeek >= 7) return true;
      if (daysPerWeek === 6) return mondayBased !== 6;
      return mondayBased < daysPerWeek;
    };

    const shortTopic = (topic: string) => {
      const topicMap: Record<string, string> = {
        "Organic Chemistry": "Organic",
        "Atoms & Compounds": "Atoms",
        "Acids, Bases & Salts": "Acids",
        "Chemical Reactions": "Reactions",
        Electrochemistry: "Electro",
        Experiments: "Experiments",
        Energetics: "Energetics",
        States: "States",
        "Periodic Table": "Periodic",
        Stoichiometry: "Stoich",
        "Metals + Periodic Table": "Metals",
        "Electrochemistry + Stoichiometry": "Electro",
        "Remaining topics": "Remaining",
        "Past papers + revision": "Revision",
        "Air and Water": "Air & Water",
      };
      return topicMap[topic] ?? topic;
    };

    const getWeekPlan = (weekNumber: number) =>
      TOPIC_SCHEDULE.find((plan) => weekNumber >= plan.startWeek && weekNumber <= plan.endWeek) ?? TOPIC_SCHEDULE[TOPIC_SCHEDULE.length - 1];

    const cells = dates.map((date) => {
      const weekNumber = Math.floor((date.getTime() - today.getTime()) / (7 * 86400000)) + 1;
      const weekPlan = getWeekPlan(weekNumber);
      if (!isStudyDay(date)) {
        return { date, topic: "Rest", fullTopic: "Rest", duration: "", subtopic: "", weekNumber };
      }
      return {
        date,
        topic: shortTopic(weekPlan.topic),
        fullTopic: weekPlan.topic,
        duration: "35 min",
        subtopic: weekPlan.subtopic,
        weekNumber,
      };
    });

    const firstOffset = (dates[0].getDay() + 6) % 7;
    const weeklyFocus = Array.from(new Set(cells.map((cell) => cell.weekNumber))).map((weekNumber) => {
      const plan = getWeekPlan(weekNumber);
      return {
        weekNumber,
        topic: plan.topic,
        subtopic: plan.subtopic,
      };
    });
    return { cells, firstOffset, today, weeklyFocus };
  }, [daysPerWeek]);

  const todayLesson = useMemo(() => {
    const todayCell = dailyCalendar.cells.find((cell) => cell.date.toDateString() === dailyCalendar.today.toDateString());
    if (!todayCell || todayCell.topic === "Rest") {
      return { topic: "Past papers + revision", subtopic: "Timed paper and weak-topic review" };
    }
    return {
      topic: todayCell.fullTopic || todayCell.topic,
      subtopic: todayCell.subtopic || "Focused study session",
    };
  }, [dailyCalendar]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>

        <p className="mb-3 text-sm font-semibold text-teal-700">
          <span className="text-slate-900">My</span>Grade<span className="text-orange-500">Pal</span>
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold text-teal-700">Your Guided Study Plan</h1>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <p>Your exam is in {daysRemaining} days.</p>
          <p>
            Study {Math.round(dailyHours * 60)} min/day on Chemistry to stay on track for grade {targetGrade}.
          </p>
        </div>

        <div className="mb-6 mt-4 rounded-xl bg-teal-600 p-5 text-center text-white">
          <p className="mb-1 text-sm opacity-80">Today&apos;s focus</p>
          <p className="mb-1 text-xl font-bold">
            {todayLesson.topic} — {todayLesson.subtopic}
          </p>
          <p className="mb-3 text-sm opacity-80">35 min session</p>
          <Link
            href={`/tutor?subject=Chemistry&topic=${encodeURIComponent(todayLesson.topic)}`}
            className="block w-full rounded-lg bg-white px-8 py-3 font-semibold text-teal-600 transition-colors hover:bg-teal-50"
          >
            Start Today&apos;s Lesson →
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Why this works:</p>
          <p className="mt-1 text-sm text-amber-900">
            Top students repeat the full course 3 times. First to learn, second to practice, third to master.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {passPlan.map((pass) => {
              const barClass = pass.color === "teal" ? "bg-teal-500" : pass.color === "orange" ? "bg-orange-500" : "bg-green-500";
              const leftBorderClass =
                pass.color === "teal" ? "border-l-4 border-l-teal-500" : pass.color === "orange" ? "border-l-4 border-l-orange-500" : "border-l-4 border-l-green-500";
              return (
                <div key={`pass-${pass.id}`} className={`rounded-xl bg-white p-5 shadow-sm ${leftBorderClass}`}>
                  <p className="text-sm font-bold text-slate-900">
                    Pass {pass.id} - {pass.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-700">{pass.passHours} hours allocated</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Weeks {pass.startWeek}-{pass.endWeek}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">{pass.description}</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${barClass}`} style={{ width: pass.barWidth }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm italic text-slate-500">
            Each pass gets faster - by Pass 3 you will move through topics 3x quicker than Pass 1.
          </p>
        </div>

        <div className="mt-7">
          <h2 className="text-sm font-semibold text-slate-700">Topic Schedule</h2>
          <div className="mt-3 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-900">Weekly Focus</h3>
            <ul className="space-y-2">
              {dailyCalendar.weeklyFocus.map((item) => (
                <li key={`week-${item.weekNumber}`} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-teal-500" />
                  <span>
                    Week {item.weekNumber}: {item.topic}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-7">
          <h2 className="text-sm font-semibold text-slate-700">Daily Calendar (Next 30 Days)</h2>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase text-slate-500">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: dailyCalendar.firstOffset }, (_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {dailyCalendar.cells.map((cell) => {
                const isToday = cell.date.toDateString() === dailyCalendar.today.toDateString();
                const isRest = cell.topic === "Rest";
                return (
                  <div
                    key={cell.date.toISOString()}
                    className={`min-h-[70px] rounded border p-1.5 text-[10px] leading-tight shadow-sm ${
                      isRest ? "border-slate-200 bg-[#f3f4f6] text-[#9ca3af]" : "border-slate-200 bg-white text-slate-700"
                    } ${isToday ? "min-h-[80px] border-2 border-teal-600" : ""}`}
                  >
                    {isToday && <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-600">TODAY</p>}
                    <p className="text-slate-500">
                      {cell.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    <p className={`truncate ${isRest ? "text-[#9ca3af]" : "text-teal-700"}`}>{cell.topic}</p>
                    <p className={isRest ? "text-[#9ca3af]" : ""}>{cell.duration || "Rest"}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700">
            Your only job is to open MyGradePal and follow today&apos;s task. We handle the rest.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
          * Suggested plan based on Cambridge 0620 syllabus. Pass times are approximate - most students find Pass 2 takes 40% less
          time than Pass 1, and Pass 3 takes 60% less time. Adjust your plan anytime.
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 w-full rounded-xl bg-teal-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Start Studying →
        </button>
        </div>
      </div>
    </div>
  );
}

export default function StudyPlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading your plan...</div>}>
      <StudyPlanContent />
    </Suspense>
  );
}
