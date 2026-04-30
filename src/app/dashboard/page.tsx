"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tier = 1 | 2 | 3 | 4;

type GuestProfile = {
  subject?: string;
  exam_date?: string;
  tier?: number;
};

type PlanRow = {
  id: string;
  topic: string;
  duration_minutes: number | null;
  scheduled_date: string;
  completed: boolean;
};

type AttemptRow = {
  question_id: string;
  result: string;
  attempted_at: string;
};

const CHEM_TOPICS = [
  "States of Matter",
  "Atoms, Elements and Compounds",
  "Stoichiometry",
  "Electrochemistry",
  "Chemical Energetics",
  "Chemical Reactions",
  "Acids, Bases and Salts",
  "The Periodic Table",
  "Metals",
  "Chemistry of the Environment",
  "Organic Chemistry",
  "Experimental Techniques & Analysis",
];

const TIER3_TOPICS = [
  "Electrochemistry",
  "Stoichiometry",
  "Acids, Bases and Salts",
  "Organic Chemistry",
  "Chemical Reactions",
];

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function daysUntil(examDate: string | null): number {
  if (!examDate) return 0;
  const exam = new Date(`${examDate}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86400000));
}

function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toIsoDate(monday), end: toIsoDate(sunday) };
}

function masteryColor(pct: number): string {
  if (pct <= 0) return "#9CA3AF";
  if (pct < 60) return "#F59E0B";
  if (pct < 80) return "#3B82F6";
  return "#10B981";
}

function masteryLabel(pct: number): string {
  if (pct <= 0) return "Not started";
  if (pct < 60) return "Familiar";
  if (pct < 80) return "Proficient";
  return "Mastered";
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [subject, setSubject] = useState("Chemistry 0620");
  const [examDate, setExamDate] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>(2);
  const [streak, setStreak] = useState(0);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [topicByQuestionId, setTopicByQuestionId] = useState<Record<string, string>>({});
  const [mustDoQuestions, setMustDoQuestions] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const guestRaw = typeof window !== "undefined" ? localStorage.getItem("mgp_guest_profile") : null;
        if (!guestRaw) {
          router.push("/login");
          return;
        }
        const guest = JSON.parse(guestRaw) as GuestProfile;
        setIsGuest(true);
        setSubject(guest.subject || "Chemistry 0620");
        setExamDate(guest.exam_date || null);
        const t = Number(guest.tier || 2);
        setTier((t >= 1 && t <= 4 ? t : 2) as Tier);
        setLoading(false);
        return;
      }

      const uid = session.user.id;
      setStudentId(uid);
      const range = weekRange();

      const [{ data: profile }, { data: streakRow }, { data: recentAttempts }, { data: questions }, { data: weekPlan }] =
        await Promise.all([
          supabase.from("user_profiles").select("tier, exam_date, subject").eq("user_id", uid).maybeSingle(),
          supabase.from("user_streaks").select("current_streak").eq("user_id", uid).maybeSingle(),
          supabase.from("user_attempts").select("question_id, result, attempted_at").eq("user_id", uid).order("attempted_at", { ascending: false }).limit(50),
          supabase.from("questions").select("question_id, topic").eq("subject", "Chemistry 0620"),
          supabase
            .from("study_plan")
            .select("id, topic, duration_minutes, scheduled_date, completed")
            .eq("student_id", uid)
            .gte("scheduled_date", range.start)
            .lte("scheduled_date", range.end)
            .order("scheduled_date", { ascending: true })
            .limit(5),
        ]);

      const p = (profile ?? {}) as { tier?: number | null; exam_date?: string | null; subject?: string | null };
      setSubject(p.subject || "Chemistry 0620");
      setExamDate(p.exam_date || null);
      setTier(((p.tier ?? 2) as Tier) || 2);
      setStreak(Number((streakRow as { current_streak?: number } | null)?.current_streak ?? 0));
      setAttempts((recentAttempts ?? []) as AttemptRow[]);
      setPlanRows((weekPlan ?? []) as PlanRow[]);

      const map: Record<string, string> = {};
      for (const q of (questions ?? []) as Array<{ question_id: string; topic: string }>) {
        map[q.question_id] = q.topic;
      }
      setTopicByQuestionId(map);
      setMustDoQuestions(
        ((questions ?? []) as Array<{ question_id: string; topic: string }>)
          .filter((q) => TIER3_TOPICS.includes(q.topic))
          .slice(0, 10)
          .map((q) => q.question_id),
      );
      setLoading(false);
    };
    void init();
  }, [router]);

  const examCountdown = useMemo(() => daysUntil(examDate), [examDate]);
  const recentActivity = useMemo(() => attempts.slice(0, 3), [attempts]);

  const topicProgress = useMemo(() => {
    const attemptedByTopic: Record<string, Set<string>> = {};
    const totalByTopic: Record<string, number> = {};
    for (const topic of CHEM_TOPICS) {
      attemptedByTopic[topic] = new Set();
      totalByTopic[topic] = 0;
    }

    for (const [qid, topic] of Object.entries(topicByQuestionId)) {
      if (totalByTopic[topic] !== undefined) totalByTopic[topic] += 1;
      if (qid && topic) {
        // intentional no-op
      }
    }
    for (const a of attempts) {
      const t = topicByQuestionId[a.question_id];
      if (t && attemptedByTopic[t]) attemptedByTopic[t].add(a.question_id);
    }
    return CHEM_TOPICS.map((topic) => {
      const total = totalByTopic[topic] || 0;
      const attempted = attemptedByTopic[topic]?.size || 0;
      const pct = total > 0 ? Math.round((attempted / total) * 100) : 0;
      return { topic, pct, attempted, total };
    });
  }, [attempts, topicByQuestionId]);

  const leastAttemptedTopic = useMemo(() => {
    const sorted = [...topicProgress].sort((a, b) => a.pct - b.pct);
    return sorted[0]?.topic ?? "Stoichiometry";
  }, [topicProgress]);

  const weeklyDone = planRows.filter((s) => s.completed).length;
  const weeklyTotal = planRows.length;
  const behindSchedule = weeklyTotal > 0 && weeklyDone < Math.floor(((new Date().getDay() || 7) / 7) * weeklyTotal) - 1;

  if (loading) return <div className="p-6 text-slate-600">Loading dashboard...</div>;

  return (
    <main className={`min-h-screen p-4 md:p-6 ${tier === 4 ? "bg-rose-50" : "bg-slate-50"}`}>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Student Dashboard</h1>
              <p className="text-sm text-slate-600">
                {subject} · Exam in {examCountdown} days
              </p>
            </div>
            <p className={`text-sm font-semibold ${streak >= 7 ? "text-amber-700" : "text-slate-700"}`}>
              {streak > 0 ? `🔥 ${streak} day streak` : "Start your streak today"}
            </p>
          </div>
          {isGuest && (
            <div className="mt-3 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
              Save your progress - <Link href="/login?tab=signup" className="font-semibold underline">create a free account</Link>
            </div>
          )}
          <nav className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/practice" className="rounded-lg border border-slate-200 px-3 py-1.5">Practice</Link>
            <Link href="/learn" className="rounded-lg border border-slate-200 px-3 py-1.5">Learn</Link>
            <Link href="/predict" className="rounded-lg border border-slate-200 px-3 py-1.5">Predict</Link>
            <Link href="/progress" className="rounded-lg border border-slate-200 px-3 py-1.5">Progress</Link>
          </nav>
        </header>

        {tier === 1 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-lg font-semibold text-teal-700">Your exam is in {examCountdown} days - you're ahead of schedule</p>
            <p className="mt-1 text-sm text-slate-600">Today's suggested topic: {leastAttemptedTopic}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topicProgress.map((row) => (
                <Link
                  key={row.topic}
                  href={`/practice?topic=${encodeURIComponent(row.topic)}`}
                  className="rounded-lg border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-slate-50"
                >
                  {(() => {
                    const radius = 32;
                    const stroke = 8;
                    const normalizedPct = Math.max(0, Math.min(100, row.pct));
                    const circumference = 2 * Math.PI * radius;
                    const dashOffset = circumference - (normalizedPct / 100) * circumference;
                    const color = masteryColor(normalizedPct);
                    return (
                      <div className="flex flex-col items-center">
                        <svg width="88" height="88" viewBox="0 0 88 88" className="mb-2">
                          <circle cx="44" cy="44" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
                          <circle
                            cx="44"
                            cy="44"
                            r={radius}
                            fill="none"
                            stroke={color}
                            strokeWidth={stroke}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 44 44)"
                          />
                          <text x="44" y="49" textAnchor="middle" className="fill-slate-800 text-sm font-semibold">
                            {normalizedPct}%
                          </text>
                          <text x="44" y="63" textAnchor="middle" className="fill-slate-500 text-[8px] font-medium">
                            {masteryLabel(normalizedPct)}
                          </text>
                        </svg>
                        <p className="text-center text-sm font-medium text-slate-800">{row.topic}</p>
                      </div>
                    );
                  })()}
                </Link>
              ))}
            </div>
          </section>
        )}

        {tier === 2 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-lg font-semibold text-slate-900">This week's schedule</p>
            <p className="text-sm text-slate-600">{weeklyDone} of {weeklyTotal || 0} sessions done this week</p>
            {behindSchedule && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">You are behind schedule this week.</p>}
            <div className="mt-3 space-y-2">
              {planRows.map((s) => {
                const today = s.scheduled_date === toIsoDate(new Date());
                const status = s.completed ? "done" : today ? "today" : "upcoming";
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.topic}</p>
                      <p className="text-xs text-slate-500">{s.duration_minutes ?? 45} min</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${status === "done" ? "bg-emerald-100 text-emerald-700" : status === "today" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tier === 3 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-lg font-semibold text-slate-900">Top 5 topics to focus on</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {TIER3_TOPICS.map((topic) => (
                <div key={topic} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">{topic}</p>
                  <Link href={`/practice?topic=${encodeURIComponent(topic)}`} className="rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white">
                    Quick start
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">Pass probability</p>
              <div className="mt-2 h-3 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-500" style={{ width: "62%" }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">62% placeholder meter</p>
            </div>
          </section>
        )}

        {tier === 4 && (
          <section className="rounded-xl border border-rose-300 bg-white p-4">
            <p className="text-xl font-bold text-rose-700">Emergency Mode</p>
            <p className="text-sm font-medium text-rose-700">{examCountdown} days until exam</p>
            <p className="mt-3 text-sm font-semibold text-slate-800">Today's must-do questions</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {mustDoQuestions.slice(0, 10).map((qid) => (
                <Link key={qid} href={`/practice?question_id=${encodeURIComponent(qid)}`} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {qid}
                </Link>
              ))}
            </div>
            <Link href="/practice" className="mt-4 block w-full rounded-lg bg-rose-600 px-4 py-3 text-center text-base font-semibold text-white">
              Start Emergency Session
            </Link>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">Recent activity</p>
          <div className="mt-2 space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">No recent question attempts yet.</p>
            ) : (
              recentActivity.map((a) => (
                <div key={`${a.question_id}-${a.attempted_at}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{a.question_id}</span>
                  <span className="ml-2 text-slate-500">({a.result})</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
