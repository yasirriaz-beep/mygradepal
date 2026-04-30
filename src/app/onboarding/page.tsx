"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GradeOption = "A*" | "A" | "B" | "C" | "D" | "Just Pass";
type SessionOption = "May/June" | "Oct/Nov";

const SUBJECTS = [
  { id: "chemistry", label: "Chemistry 0620", active: true, paperCode: "P2/P4/P6", questions: "6,800+ questions" },
  { id: "physics", label: "Physics 0625", active: false },
  { id: "biology", label: "Biology 0610", active: false },
  { id: "mathematics", label: "Mathematics 0580", active: false },
  { id: "english", label: "English 0510", active: false },
  { id: "pak-studies", label: "Pakistan Studies 0448", active: false },
  { id: "islamiyat", label: "Islamiyat 0493", active: false },
  { id: "history", label: "History 0470", active: false },
  { id: "geography", label: "Geography 0460", active: false },
] as const;

const GRADES: GradeOption[] = ["A*", "A", "B", "C", "D", "Just Pass"];
const DAYS_PER_WEEK = [2, 3, 4, 5, 6, 7];
const SESSION_DURATIONS = ["30 min", "45 min", "1 hour", "1.5 hours", "2 hours"] as const;
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
const TIER_TOTAL_HOURS: Record<1 | 2 | 3 | 4, number> = {
  1: 420,
  2: 280,
  3: 141,
  4: 70,
};
const TOPIC_COLORS = [
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "bg-sky-100 text-sky-800 border-sky-200",
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

function parseSessionDurationToMinutes(duration: (typeof SESSION_DURATIONS)[number]): number {
  const value = duration.toLowerCase().trim();
  if (value.includes("hour")) {
    const hours = Number.parseFloat(value);
    return Number.isFinite(hours) ? Math.round(hours * 60) : 45;
  }
  const minutes = Number.parseInt(value, 10);
  return Number.isFinite(minutes) ? minutes : 45;
}

function getExamDate(session: SessionOption, year: number): Date {
  const month = session === "May/June" ? 4 : 9;
  return new Date(year, month, 15);
}

function getDaysRemaining(examDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / 86400000));
}

function getTier(daysRemaining: number): 1 | 2 | 3 | 4 {
  if (daysRemaining >= 700) return 1;
  if (daysRemaining >= 180) return 2;
  if (daysRemaining >= 60) return 3;
  return 4;
}

function getTierMessage(tier: 1 | 2 | 3 | 4): string {
  if (tier === 1) return "You have plenty of time - we'll build a complete mastery plan.";
  if (tier === 2) return "Great - we'll keep you on a structured schedule.";
  if (tier === 3) return "Let's focus on the highest-yield topics.";
  return "Exam soon - we'll go straight to what matters most.";
}

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type GuestProfile = {
  subject: string;
  exam_date: string;
  target_grade: GradeOption | "";
  tier: 1 | 2 | 3 | 4;
  days_per_week: number;
  session_duration: number;
  study_mode: "guided" | "free";
  parent_email?: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [subject, setSubject] = useState<string>("");
  const [session, setSession] = useState<SessionOption>("May/June");
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear() + 1);
  const [targetGrade, setTargetGrade] = useState<GradeOption | "">("");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [sessionDuration, setSessionDuration] = useState<(typeof SESSION_DURATIONS)[number]>("45 min");
  const [parentEmail, setParentEmail] = useState<string>("");
  const [studyMode, setStudyMode] = useState<"guided" | "free">("guided");
  const [topicSchedule, setTopicSchedule] = useState<string[]>([
    "Week 1-2: Organic Chemistry",
    "Week 3-4: Atoms & Compounds",
    "Week 5-6: Acids, Bases & Salts",
    "Week 7-8: Chemical Reactions",
    "Week 9-10: Metals + Periodic Table",
    "Week 11-12: Remaining topics",
    "Week 13+: Past papers + revision",
  ]);

  const examDate = useMemo(() => getExamDate(session, examYear), [session, examYear]);
  const daysRemaining = useMemo(() => getDaysRemaining(examDate), [examDate]);
  const tier = useMemo(() => getTier(daysRemaining), [daysRemaining]);
  const tierMessage = useMemo(() => getTierMessage(tier), [tier]);
  const progressStep = Math.min(step, 5);
  const years = useMemo(() => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i), []);
  const planDaysPerWeek = useMemo(() => (step < 5 ? 5 : daysPerWeek), [step, daysPerWeek]);
  const totalStudyHours = useMemo(() => TIER_TOTAL_HOURS[tier], [tier]);
  const dailyHours = useMemo(() => {
    if (daysRemaining <= 0) return 4;
    const raw = (totalStudyHours / daysRemaining / Math.max(planDaysPerWeek, 1)) * 7;
    return Math.min(4, Math.max(1, Number(raw.toFixed(1))));
  }, [daysRemaining, planDaysPerWeek, totalStudyHours]);
  const weeksUntilExam = useMemo(() => Math.max(1, Math.ceil(daysRemaining / 7)), [daysRemaining]);
  const timeline = useMemo(() => {
    let currentStartDate = new Date();
    currentStartDate.setHours(0, 0, 0, 0);
    let weekCursor = 1;
    return TOPIC_HOURS.map((item, idx) => {
      const topicWeeks = Math.max(1, Math.ceil(item.hours / Math.max(dailyHours, 1)));
      const startWeek = weekCursor;
      const endWeek = weekCursor + topicWeeks - 1;
      const startDate = new Date(currentStartDate);
      currentStartDate.setDate(currentStartDate.getDate() + topicWeeks * 7);
      weekCursor = endWeek + 1;
      return {
        ...item,
        startWeek,
        endWeek,
        weeks: topicWeeks,
        startDate,
        color: TOPIC_COLORS[idx % TOPIC_COLORS.length],
      };
    });
  }, [dailyHours]);
  const passPlan = useMemo(() => {
    const totalWeeks = Math.max(weeksUntilExam, 1);
    let weekCursor = 1;
    let dateCursor = new Date();
    dateCursor.setHours(0, 0, 0, 0);
    return PASS_DEFINITIONS.map((pass, index) => {
      const passHours = Math.round(totalStudyHours * pass.ratio);
      const passWeeks =
        index === PASS_DEFINITIONS.length - 1
          ? Math.max(1, totalWeeks - (weekCursor - 1))
          : Math.max(1, Math.round(totalWeeks * pass.ratio));
      const startWeek = weekCursor;
      const endWeek = Math.min(totalWeeks, startWeek + passWeeks - 1);
      const startDate = new Date(dateCursor);
      dateCursor.setDate(dateCursor.getDate() + passWeeks * 7);
      weekCursor = endWeek + 1;
      return {
        ...pass,
        passHours,
        passWeeks,
        startWeek,
        endWeek,
        startDate,
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
      const mondayBased = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
      if (planDaysPerWeek >= 7) return true;
      if (planDaysPerWeek === 6) return mondayBased !== 6;
      return mondayBased < planDaysPerWeek;
    };

    const studyDayCount = dates.filter((d) => isStudyDay(d)).length;
    const totalTopicHours = TOPIC_HOURS.reduce((sum, t) => sum + t.hours, 0);
    const topicDayBase = TOPIC_HOURS.map((t) => {
      const rawDays = (t.hours / totalTopicHours) * studyDayCount;
      return { topic: t.topic, rawDays, assignedDays: Math.floor(rawDays) };
    });
    let assigned = topicDayBase.reduce((sum, t) => sum + t.assignedDays, 0);
    let remaining = studyDayCount - assigned;
    const byRemainder = [...topicDayBase]
      .map((t) => ({ ...t, rem: t.rawDays - t.assignedDays }))
      .sort((a, b) => b.rem - a.rem);
    let idx = 0;
    while (remaining > 0 && byRemainder.length > 0) {
      byRemainder[idx % byRemainder.length].assignedDays += 1;
      remaining -= 1;
      idx += 1;
    }

    const topicColorMap = new Map<string, string>();
    TOPIC_HOURS.forEach((t, i) => topicColorMap.set(t.topic, TOPIC_COLORS[i % TOPIC_COLORS.length]));
    const shortTopic = (topic: string) =>
      topic
        .replace("Atoms Elements and Compounds", "Atoms & Compounds")
        .replace("Acids Bases and Salts", "Acids/Bases")
        .replace("The Periodic Table", "Periodic Table")
        .replace("Experimental Techniques", "Experiments");

    const studyQueue: Array<{ topic: string; color: string }> = [];
    byRemainder.forEach((t) => {
      for (let i = 0; i < t.assignedDays; i += 1) {
        studyQueue.push({
          topic: t.topic,
          color: topicColorMap.get(t.topic) ?? "bg-slate-100 text-slate-700 border-slate-200",
        });
      }
    });

    const cells = dates.map((date) => {
      const study = isStudyDay(date);
      if (!study) {
        return {
          date,
          topic: "Rest",
          duration: "",
          color: "bg-slate-100 text-slate-500 border-slate-200",
        };
      }
      const next = studyQueue.shift() ?? {
        topic: "Past Papers",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      };
      return {
        date,
        topic: shortTopic(next.topic),
        duration: "35 min",
        color: next.color,
      };
    });

    const firstOffset = (dates[0].getDay() + 6) % 7;
    return { cells, firstOffset, today };
  }, [planDaysPerWeek]);

  const canContinue =
    (step === 1 && subject === "Chemistry 0620") ||
    step === 4 ||
    (step === 2 && Boolean(session) && Boolean(examYear)) ||
    (step === 3 && Boolean(targetGrade)) ||
    (step === 5 && Boolean(daysPerWeek) && Boolean(sessionDuration));

  const handleBack = () => setStep((s) => Math.max(1, s - 1));
  const handleNext = () => {
    if (step === 3) {
      setStep(4);
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const studentName =
        String(authSession?.user?.user_metadata?.child_name ?? authSession?.user?.user_metadata?.name ?? "").trim() || null;

      const guestPayload: GuestProfile = {
        subject: "Chemistry 0620",
        exam_date: formatDateForInput(examDate),
        target_grade: targetGrade,
        tier,
        days_per_week: daysPerWeek,
        session_duration: parseSessionDurationToMinutes(sessionDuration),
        study_mode: studyMode,
        parent_email: parentEmail.trim() || undefined,
      };

      if (!user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("mgp_guest_profile", JSON.stringify(guestPayload));
          localStorage.setItem("mgp_onboarded", "true");
        }
        router.push("/dashboard");
        return;
      }

      const payload = {
        user_id: user.id,
        ...guestPayload,
        parent_email: parentEmail.trim() || null,
        student_name: studentName,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("user_profiles").insert(payload);
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("mgp_onboarded", "true");
      }
      router.push("/dashboard");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save onboarding profile.");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Step {progressStep} of 5</span>
            <span>{Math.round((progressStep / 5) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{ width: `${(progressStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <section>
            <h1 className="text-2xl font-semibold text-slate-900">Choose your subject</h1>
            <p className="mt-2 text-sm text-slate-600">Start with Chemistry today. More subjects are coming soon.</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {SUBJECTS.map((item) => {
                const selected = subject === item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.active}
                    onClick={() => item.active && setSubject(item.label)}
                    className={`rounded-xl border p-4 text-left transition ${
                      item.active
                        ? selected
                          ? "border-teal-600 bg-teal-50"
                          : "border-slate-200 hover:border-teal-400"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    <p className={`text-sm font-medium ${item.active ? "text-slate-900" : "text-slate-500"}`}>{item.label}</p>
                    {item.active ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-slate-600">Paper code: {item.paperCode}</p>
                        <p className="text-xs font-semibold text-teal-700">{item.questions}</p>
                      </div>
                    ) : (
                      <span className="mt-2 inline-block rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-500">
                        Coming Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-2xl font-semibold text-slate-900">When is your Cambridge exam?</h1>
            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Session</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["May/June", "Oct/Nov"] as SessionOption[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSession(value)}
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        session === value ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="exam-year">
                  Year
                </label>
                <select
                  id="exam-year"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  value={examYear}
                  onChange={(e) => setExamYear(Number(e.target.value))}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
              Your exam is in <span className="font-semibold">{daysRemaining} days</span>.
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-2xl font-semibold text-slate-900">What is your target grade?</h1>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              {GRADES.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setTargetGrade(grade)}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                    targetGrade === grade ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-700"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="text-2xl font-semibold text-slate-900">Study Plan Overview</h1>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setStudyMode("guided")}
                className={`relative rounded-xl border p-5 text-left transition ${
                  studyMode === "guided"
                    ? "scale-[1.01] border-teal-400 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-2xl">📅</span>
                <p className="mt-2 text-base font-semibold text-slate-900">Follow my plan</p>
                <p className="mt-1 text-sm text-slate-600">
                  We plan every day for you. Just open the app and follow today&apos;s task. Best for most students.
                </p>
                <span className="absolute right-3 top-3 rounded-full bg-teal-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Recommended
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudyMode("free")}
                className={`rounded-xl border p-4 text-left transition ${
                  studyMode === "free" ? "border-slate-400 bg-slate-50 shadow-sm" : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-2xl">🧭</span>
                <p className="mt-2 text-base font-semibold text-slate-900">I&apos;ll navigate myself</p>
                <p className="mt-1 text-sm text-slate-600">
                  Browse topics freely. Best if you&apos;re self-disciplined or need to strengthen specific areas.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  You can switch to a guided plan anytime from your dashboard settings.
                </p>
              </button>
            </div>

            <div className="mt-5 space-y-1 text-sm text-slate-700">
              <p>Your exam is in {daysRemaining} days.</p>
              <p>Study 35 min/day on Chemistry to stay on track.</p>
            </div>

            {studyMode === "guided" ? (
              <>
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {passPlan.map((pass) => {
                      const barClass =
                        pass.color === "teal" ? "bg-teal-500" : pass.color === "orange" ? "bg-orange-500" : "bg-green-500";
                      return (
                        <div key={`pass-${pass.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-800">
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
                  <div className="mt-3 space-y-3">
                    {topicSchedule.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                        <p className="font-medium text-slate-700">{item}</p>
                      </div>
                    ))}
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
                        return (
                          <div key={cell.date.toISOString()} className={`rounded border p-1.5 text-[10px] leading-tight ${cell.color} ${isToday ? "ring-2 ring-teal-500" : ""}`}>
                            <p className="font-semibold">
                              {cell.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </p>
                            <p className="truncate">{cell.topic}</p>
                            <p>{cell.duration || "Rest"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    Your only job is to open MyGradePal and follow today&apos;s task. We handle the rest.
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  You&apos;re in control. We&apos;ll track your progress and suggest weak areas to focus on - but you choose what to
                  study each day.
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-slate-700">Topic Mastery</h2>
                  <div className="mt-3 space-y-2">
                    {TOPIC_HOURS.map((t) => (
                      <div key={t.topic} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                        <span className="text-slate-700">{t.topic}</span>
                        <span className="font-semibold text-slate-500">0%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  💡 Start with Organic Chemistry - it&apos;s the most tested topic
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                💡 Top students repeat the full course 3 times. First to learn, second to practice, third to master. Your plan is
                built around this.
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              Study <span className="font-semibold text-orange-600">{dailyHours} hours</span> per day,{" "}
              <span className="font-semibold text-orange-600">{planDaysPerWeek} days</span> per week to complete Chemistry before your exam.
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="text-2xl font-semibold text-slate-900">Set your study schedule</h1>
            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">How many days per week can you study?</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {DAYS_PER_WEEK.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDaysPerWeek(days)}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        daysPerWeek === days ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200"
                      }`}
                    >
                      {days}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">How long per session?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SESSION_DURATIONS.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setSessionDuration(duration)}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        sessionDuration === duration ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200"
                      }`}
                    >
                      {duration}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="parent-email">
                  Parent&apos;s email (for progress updates)
                </label>
                <input
                  id="parent-email"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  We&apos;ll send weekly reports and alerts if your child misses a session.
                </p>
              </div>
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Your plan is ready</h1>
            <p className="mt-3 text-sm text-slate-600">We will start with your highest impact Chemistry sessions first.</p>
            {saveError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{saveError}</p>}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="mt-8 w-full rounded-lg bg-teal-600 px-5 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Start Studying ->"}
            </button>
          </section>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 1 && step <= 6 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 6 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
