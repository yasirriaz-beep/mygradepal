"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const subjects = [
  { name: "Chemistry", code: "0620", color: "bg-brand-teal" },
  { name: "Physics", code: "0625", color: "bg-brand-teal-dark" },
  { name: "Mathematics", code: "0580", color: "bg-brand-orange" }
];

export default function DashboardPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [subjectMastery, setSubjectMastery] = useState<Record<string, number>>({});
  const [weakestTopic, setWeakestTopic] = useState<{ subject: string; topic: string; mastery: number } | null>(
    null,
  );

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (error || !sessionUser) {
        router.push("/login");
        return;
      }

      const metadata = sessionUser.user_metadata ?? {};
      const displayName =
        metadata.child_name ??
        metadata.name ??
        sessionUser.email?.split("@")[0] ??
        "Student";

      setStudentName(String(displayName));
      setStudentId(sessionUser.id);
      setIsCheckingSession(false);
    };

    void checkSession();
  }, [router]);

  useEffect(() => {
    if (!studentId) return;

    const loadMastery = async () => {
      const { data, error } = await supabase
        .from("topic_scores")
        .select("subject, topic, mastery, score_percent")
        .eq("student_id", studentId);

      if (error || !data) {
        setSubjectMastery({});
        return;
      }

      const grouped: Record<string, number[]> = {};
      let weakest: { subject: string; topic: string; mastery: number } | null = null;
      for (const row of data as Array<Record<string, unknown>>) {
        const subject = String((row.subject as string) ?? "").trim();
        const topic = String((row.topic as string) ?? "").trim();
        if (!subject) continue;

        const masteryValue = Number((row.mastery as number) ?? (row.score_percent as number) ?? 0);
        const safeMastery = Math.min(100, Math.max(0, masteryValue));
        if (topic) {
          if (!weakest || safeMastery < weakest.mastery) {
            weakest = { subject, topic, mastery: Math.round(safeMastery) };
          }
        }
        if (!grouped[subject]) {
          grouped[subject] = [];
        }
        grouped[subject].push(safeMastery);
      }

      const averages: Record<string, number> = {};
      for (const [subject, values] of Object.entries(grouped)) {
        const total = values.reduce((sum, value) => sum + value, 0);
        averages[subject] = values.length ? Math.round(total / values.length) : 0;
      }

      setSubjectMastery(averages);
      setWeakestTopic(weakest);
    };

    void loadMastery();
  }, [studentId]);

  const masteryBySubject = useMemo(() => subjectMastery, [subjectMastery]);
  const avatarLetter = studentName?.trim()?.charAt(0)?.toUpperCase() || "S";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (isCheckingSession) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-card">Checking your account...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-card">
        <Logo className="text-2xl" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
          >
            <div className="text-right">
              <p className="text-xs text-slate-500">Student</p>
              <p className="font-semibold text-slate-900">{studentName}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-bold text-brand-teal">
              {avatarLetter}
            </div>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-14 z-20 min-w-[140px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="mb-5">
        <h2 className="heading-font text-2xl font-bold text-slate-900">
          Good evening, {studentName}! Ready to study?
        </h2>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <article key={subject.code} className={`${subject.color} rounded-2xl p-4 text-white shadow-card`}>
            {/** Uses avg topic_scores mastery for logged-in student. */}
            {(() => {
              const mastery = masteryBySubject[subject.name] ?? 0;
              return (
                <>
            <p className="heading-font text-lg font-semibold">{subject.name}</p>
            <p className="text-sm text-white/90">({subject.code})</p>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>Mastery</span>
                <span>{mastery}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/30">
                <div className="h-2 rounded-full bg-white" style={{ width: `${mastery}%` }} />
              </div>
            </div>

            <Link
              href={`/practice?subject=${encodeURIComponent(subject.name)}`}
              className="mt-4 block w-full rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Practice now
            </Link>
                </>
              );
            })()}
          </article>
        ))}
      </section>

      <section className="mt-7">
        <h3 className="heading-font text-xl font-semibold text-slate-900">
          Continue where you left off
        </h3>
        <article className="mt-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-card">
          <p className="font-medium text-slate-900">Chemistry P2: Acids, Bases and Salts</p>
          <p className="mt-1 text-sm text-slate-600">
            You completed 3 of 12 questions. Resume anytime.
          </p>
          <button className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white">
            Resume practice
          </button>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-teal-200 bg-white p-4 shadow-card">
        <h3 className="heading-font text-xl font-semibold text-slate-900">Study plan for today</h3>
        <p className="mt-2 text-sm text-slate-700">
          Today focus on:{" "}
          <span className="font-semibold">
            {weakestTopic ? `${weakestTopic.topic} (${weakestTopic.mastery}% mastery)` : "Stoichiometry (38% mastery)"}
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-600">Suggested: 20 min lesson + 5 practice questions</p>
        <Link
          href={
            weakestTopic
              ? `/tutor?subject=${encodeURIComponent(weakestTopic.subject)}&topic=${encodeURIComponent(weakestTopic.topic)}`
              : "/tutor?subject=Chemistry&topic=Stoichiometry"
          }
          className="mt-3 inline-block rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Start today&apos;s plan
        </Link>
      </section>

      <BottomNav />
    </main>
  );
}
