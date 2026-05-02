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

/** Text gray on white ≥ ~7:1 (small body) */
const TEXT_BODY = "#374151";
/** Readable gray accent, avoids “washed” look on white */
const TEXT_MUTED = "#4B5563";
const TEXT_TITLE = "#111827";
const BRAND_TEAL = "#189080";
const BRAND_ORANGE = "#f5731e";
const ENCOURAGE_BG = "#F0FAFA";

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

  const examLine =
    daysUntilExam === null
      ? "Set your exam date to start the countdown."
      : `Your Cambridge exam is in ${daysUntilExam} days`;

  const shellClasses = "min-h-screen bg-[#F9FAFB]";
  /** Body: DM Sans 15px, leading 1.6 */
  const bodyText = `body-font text-[15px] leading-[1.6]`;

  if (loading) {
    return (
      <main className={shellClasses}>
        <div className={`mx-auto max-w-2xl px-4 py-6 ${bodyText}`} style={{ color: TEXT_BODY }}>
          <p>Loading Mission Control...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={shellClasses}>
      <div className={`mx-auto max-w-2xl px-4 pb-12 pt-6 ${bodyText}`} style={{ color: TEXT_BODY }}>
        {isGuest && (
          <section
            className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm"
            style={{ color: "#7c2d12" }}
          >
            <p className="body-font font-medium leading-[1.6]">
              You&apos;re in guest mode. Save your progress permanently by creating your account.
            </p>
            <Link
              href="/login?tab=signup"
              className="body-font mt-3 inline-block text-[15px] font-semibold leading-[1.6]"
              style={{ color: BRAND_ORANGE }}
            >
              Sign up now →
            </Link>
          </section>
        )}

        {/* Greeting */}
        <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="body-font text-base leading-[1.6]" style={{ color: TEXT_MUTED }}>
            Good {getDayPeriod()},
          </p>
          <h1 className="heading-font mt-0.5 text-[28px] font-bold leading-tight tracking-tight" style={{ color: TEXT_TITLE }}>
            {name}
          </h1>
          <p className="heading-font mt-3 text-[18px] font-bold leading-snug" style={{ color: BRAND_TEAL }}>
            {examLine}
          </p>
          <div
            className="heading-font mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ background: BRAND_ORANGE }}
          >
            🔥 {streak} day streak
          </div>
        </section>

        {/* TODAY'S MISSION */}
        <section
          className="mb-4 rounded-2xl p-6 text-white shadow-sm"
          style={{ backgroundColor: BRAND_TEAL }}
        >
          <p className="body-font text-[11px] font-semibold uppercase tracking-[0.2em] leading-normal text-white/80">
            Today&apos;s mission
          </p>
          <h2 className="heading-font mt-2 text-[22px] font-bold leading-tight">Pass 1 — Week {weekNumber}</h2>
          <p className="body-font mt-3 text-[18px] font-medium leading-snug">{todayTopic}</p>
          <p className="body-font mt-2 text-[14px] leading-normal text-white/75">35 min session</p>
          <Link
            href="/learn/chemistry"
            className="body-font mt-5 inline-flex rounded-lg bg-white px-5 py-2.5 text-[15px] font-semibold leading-none shadow-sm transition hover:bg-gray-50"
            style={{ color: BRAND_TEAL }}
          >
            Start today&apos;s session →
          </Link>
        </section>

        {/* Progress */}
        <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="heading-font text-[18px] font-bold leading-tight" style={{ color: TEXT_TITLE }}>
            Your Progress
          </h2>
          <p className="body-font mt-4 text-[15px] font-medium leading-[1.6]" style={{ color: TEXT_BODY }}>
            Overall mastery: {masteryPercent}%
          </p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${masteryBarWidth}%`, backgroundColor: BRAND_TEAL }}
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-100 px-4 py-4 text-center">
              <p className="heading-font text-2xl font-bold leading-none" style={{ color: BRAND_TEAL }}>
                {topicsCovered}
              </p>
              <p className="body-font mt-2 text-[13px] leading-tight" style={{ color: TEXT_BODY }}>
                of {TOPIC_GOAL} topics covered
              </p>
            </div>
            <div className="rounded-xl bg-gray-100 px-4 py-4 text-center">
              <p className="heading-font text-2xl font-bold leading-none" style={{ color: BRAND_TEAL }}>
                {questionsAttempted}
              </p>
              <p className="body-font mt-2 text-[13px] leading-tight" style={{ color: TEXT_BODY }}>
                questions attempted
              </p>
            </div>
            <div className="rounded-xl bg-gray-100 px-4 py-4 text-center">
              <p className="heading-font text-2xl font-bold leading-none" style={{ color: BRAND_TEAL }}>
                {flashcardsMastered}
              </p>
              <p className="body-font mt-2 text-[13px] leading-tight" style={{ color: TEXT_BODY }}>
                flashcards mastered
              </p>
            </div>
          </div>
        </section>

        {/* Encouraging message */}
        <section
          className="body-font mb-4 rounded-r-2xl border-l-[3px] py-4 pl-4 pr-5 text-[15px] italic leading-[1.6] shadow-sm"
          style={{
            borderLeftColor: BRAND_TEAL,
            backgroundColor: ENCOURAGE_BG,
            color: TEXT_MUTED,
          }}
        >
          {motivation}
        </section>

        {weakAreas.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="heading-font text-[18px] font-bold leading-tight" style={{ color: TEXT_TITLE }}>
              Weak areas to strengthen
            </h2>
            <div className="mt-6 space-y-4">
              {weakAreas.map((area) => {
                const label = area.subtopic || area.topic || "Untitled subtopic";
                return (
                  <div
                    key={`${area.topic}-${area.subtopic}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-[#FAFAFA] px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="heading-font text-[15px] font-bold leading-snug" style={{ color: TEXT_TITLE }}>
                        {label}
                      </p>
                      <p className="body-font mt-1 text-[13px] leading-snug" style={{ color: TEXT_BODY }}>
                        Score: {Math.round(Number(area.score_percent ?? 0))}%
                      </p>
                    </div>
                    <Link
                      href={`/practice?subtopic=${encodeURIComponent(label)}`}
                      className="body-font shrink-0 text-[15px] font-semibold leading-snug hover:underline"
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
      </div>
    </main>
  );
}
