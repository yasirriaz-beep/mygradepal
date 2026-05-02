"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type GuestProfile = {
  name?: string;
  child_name?: string;
  student_name?: string;
  exam_date?: string;
};

type MissionRow = {
  week_number: number | null;
  topic: string | null;
};

type WeakArea = {
  topic: string | null;
  subtopic: string | null;
  score_percent: number | null;
};

const TOPIC_GOAL = 12;
const BRAND_TEAL = "#189080";
const BRAND_ORANGE = "#f5731e";

function getDayPeriod(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getDaysUntil(dateLike: string | null): number | null {
  if (!dateLike) return null;
  const exam = new Date(dateLike);
  if (Number.isNaN(exam.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfExam = new Date(exam);
  startOfExam.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((startOfExam.getTime() - startOfToday.getTime()) / 86400000));
}

function parseGuestProfile(): GuestProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("mgp_guest_profile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestProfile;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [name, setName] = useState("Student");
  const [examDate, setExamDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [todayTopic, setTodayTopic] = useState("Electrolysis");
  const [masteryPercent, setMasteryPercent] = useState(0);
  const [topicsCovered, setTopicsCovered] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [flashcardsMastered, setFlashcardsMastered] = useState(0);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);

  useEffect(() => {
    const load = async () => {
      const guest = parseGuestProfile();
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      if (!user) {
        setIsGuest(true);
        if (guest) {
          const guestName = guest.name ?? guest.child_name ?? guest.student_name;
          if (guestName?.trim()) setName(guestName.trim());
          if (guest.exam_date) setExamDate(guest.exam_date);
        }
        setLoading(false);
        return;
      }

      const fallbackName = user.user_metadata?.child_name || user.user_metadata?.full_name || user.email || "Student";
      setName(String(fallbackName).split("@")[0]);

      const [profileRes, studentRes, streakRes, missionRes, masteryRes, attemptsRes, flashcardsRes, weakRes] =
        await Promise.all([
          supabase
            .from("user_profiles")
            .select("exam_date, student_name")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("students").select("name").eq("id", user.id).maybeSingle(),
          supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("study_plan")
            .select("week_number, topic")
            .eq("student_id", user.id)
            .gte("scheduled_date", new Date().toISOString().slice(0, 10))
            .order("scheduled_date", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase.from("mastery_progress").select("topic, score_percent").eq("user_id", user.id),
          supabase.from("user_attempts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("flashcard_progress")
            .select("*", { count: "exact", head: true })
            .eq("student_id", user.id)
            .eq("status", "known"),
          supabase
            .from("mastery_progress")
            .select("topic, subtopic, score_percent")
            .eq("user_id", user.id)
            .lt("score_percent", 60)
            .order("score_percent", { ascending: true })
            .limit(3),
        ]);

      const studentName = profileRes.data?.student_name || studentRes.data?.name;
      if (studentName?.trim()) setName(studentName.trim());
      setExamDate(profileRes.data?.exam_date ?? guest?.exam_date ?? null);
      setStreak(Math.max(0, Number(streakRes.data?.current_streak ?? 0)));

      const mission = missionRes.data as MissionRow | null;
      if (mission?.week_number) setWeekNumber(mission.week_number);
      if (mission?.topic?.trim()) setTodayTopic(mission.topic.trim());

      const masteryRows = masteryRes.data ?? [];
      if (masteryRows.length > 0) {
        const total = masteryRows.reduce((sum, row) => sum + Number(row.score_percent ?? 0), 0);
        setMasteryPercent(Math.round(total / masteryRows.length));
        setTopicsCovered(new Set(masteryRows.map((row) => row.topic).filter(Boolean)).size);
      } else {
        setMasteryPercent(0);
        setTopicsCovered(0);
      }

      setQuestionsAttempted(attemptsRes.count ?? 0);
      setFlashcardsMastered(flashcardsRes.count ?? 0);
      setWeakAreas((weakRes.data as WeakArea[] | null) ?? []);
      setLoading(false);
    };

    void load();
  }, []);

  const daysUntilExam = getDaysUntil(examDate);
  const masteryBarWidth = Math.min(100, Math.max(0, masteryPercent));

  const motivation = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const messages = [
      "The students who ace Cambridge aren't smarter than you. They just showed up every day. You're on day {streak}. Keep going.",
      "Consistency beats intensity. A focused 35 minutes today moves you ahead.",
      "Progress compounds. Every question you attempt is building exam confidence.",
      "Small daily wins become top grades by exam day.",
      "You don't need perfect sessions. You need repeatable ones.",
      "One topic at a time. One day at a time. You're doing it right.",
      "Momentum is your superpower now. Protect the streak.",
      "Your future self will thank you for starting today, not tomorrow.",
      "Most students quit when it gets hard. You keep showing up.",
      "Cambridge success is earned in sessions like this one.",
    ];
    return messages[dayOfYear % 10].replace("{streak}", String(streak));
  }, [streak]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
        <p className="text-sm text-slate-600">Loading Mission Control...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-5 px-4 py-5 sm:px-6">
      {isGuest && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-900">
            You&apos;re in guest mode. Save your progress permanently by creating your account.
          </p>
          <Link href="/login?tab=signup" className="mt-2 inline-block text-sm font-semibold" style={{ color: BRAND_ORANGE }}>
            Sign up now →
          </Link>
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
        <h1 className="heading-font text-2xl font-bold text-slate-900">
          Good {getDayPeriod()}, {name}
        </h1>
        <p className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          {daysUntilExam === null ? "Set your exam date to start the countdown." : `Your Cambridge exam is in ${daysUntilExam} days`}
        </p>
        <div className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: BRAND_ORANGE }}>
          🔥 {streak} day streak
        </div>
      </section>

      <section className="rounded-3xl p-5 text-white shadow-card sm:p-6" style={{ background: BRAND_TEAL }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Today&apos;s mission</p>
        <h2 className="mt-1 text-2xl font-bold">Pass 1 — Week {weekNumber}</h2>
        <p className="mt-2 text-lg text-teal-50">{todayTopic}</p>
        <p className="mt-1 text-sm text-teal-100">35 min session</p>
        <Link
          href="/learn/chemistry"
          className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold"
          style={{ color: BRAND_TEAL }}
        >
          Start today&apos;s session →
        </Link>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">Progress</h3>
        <p className="mt-3 text-sm font-semibold text-slate-700">Overall mastery: {masteryPercent}%</p>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full transition-all" style={{ width: `${masteryBarWidth}%`, background: BRAND_TEAL }} />
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <p>
            {topicsCovered} of {TOPIC_GOAL} topics covered
          </p>
          <p>{questionsAttempted} questions attempted</p>
          <p>{flashcardsMastered} flashcards mastered</p>
        </div>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-teal-50 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-teal-900">{motivation}</p>
      </section>

      {weakAreas.length > 0 && (
        <section className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
          <h3 className="text-lg font-bold text-slate-900">Weak areas to strengthen</h3>
          <div className="mt-4 space-y-3">
            {weakAreas.map((area) => {
              const label = area.subtopic || area.topic || "Untitled subtopic";
              return (
                <div key={`${area.topic}-${area.subtopic}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{label}</p>
                    <p className="text-sm text-slate-600">Score: {Math.round(Number(area.score_percent ?? 0))}%</p>
                  </div>
                  <Link
                    href={`/practice?subtopic=${encodeURIComponent(label)}`}
                    className="text-sm font-semibold"
                    style={{ color: BRAND_TEAL }}
                  >
                    Practice now →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
