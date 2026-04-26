"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { getTrialInfo } from "@/lib/trialStatus";
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
  const [userEmail, setUserEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [childGrade, setChildGrade] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [examSession, setExamSession] = useState("");
  const [examYear, setExamYear] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [trial, setTrial] = useState(() => getTrialInfo());
  const [subjectMastery, setSubjectMastery] = useState<Record<string, number>>({});
  const [weakestTopic, setWeakestTopic] = useState<{ subject: string; topic: string; mastery: number } | null>(
    null,
  );
  const [todayPlan, setTodayPlan] = useState<{
    subject: string;
    topic: string;
    subtopic: string;
    mode: string;
    minutesPlanned: number;
  } | null>(null);
  const [weekPlan, setWeekPlan] = useState<
    Array<{
      scheduledDate: string;
      topic: string;
      subtopic: string;
      mode: string;
      completed: boolean;
    }>
  >([]);

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
      setUserEmail(sessionUser.email ?? "");
      setChildName(String(metadata.child_name ?? displayName));
      setChildGrade(String(metadata.grade ?? metadata.child_grade ?? ""));
      setStudentId(sessionUser.id);
      setTrial(getTrialInfo());
      setIsCheckingSession(false);
    };

    void checkSession();
  }, [router]);

  useEffect(() => {
    if (!studentId) return;

    supabase
      .from("students")
      .select("onboarding_complete")
      .eq("id", studentId)
      .single()
      .then(({ data }) => {
        if (!data || !data.onboarding_complete) {
          router.push("/onboarding");
        }
      });
  }, [studentId, router]);

  useEffect(() => {
    if (!studentId) return;

    const loadStudentPlan = async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("name, target_grade, exam_session, exam_year, onboarding_subject")
        .eq("id", studentId)
        .single();

      if (studentData?.target_grade) setTargetGrade(String(studentData.target_grade));
      if (studentData?.exam_session) setExamSession(String(studentData.exam_session));
      if (studentData?.exam_year) setExamYear(Number(studentData.exam_year));
    };

    void loadStudentPlan();
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    const loadMastery = async () => {
      const { data, error } = await supabase
        .from("topic_scores")
        .select("subject, topic, mastery")
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

        const masteryValue = Number((row.mastery as number) ?? 0);
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

  useEffect(() => {
    if (!studentId) return;

    const loadStudyPlan = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(today.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const todayStr = today.toISOString().split("T")[0];
      const mondayStr = monday.toISOString().split("T")[0];
      const sundayStr = sunday.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("study_plan")
        .select("subject, topic, subtopic, mode, completed, scheduled_date, minutes_planned")
        .eq("student_id", studentId)
        .gte("scheduled_date", mondayStr)
        .lte("scheduled_date", sundayStr)
        .order("scheduled_date", { ascending: true })
        .order("day_number", { ascending: true });

      if (error || !data) {
        setTodayPlan(null);
        setWeekPlan([]);
        return;
      }

      const rows = data as Array<Record<string, unknown>>;
      const todayEntry = rows.find((row) => String(row.scheduled_date ?? "") === todayStr);
      if (todayEntry) {
        setTodayPlan({
          subject: String(todayEntry.subject ?? "Chemistry"),
          topic: String(todayEntry.topic ?? ""),
          subtopic: String(todayEntry.subtopic ?? ""),
          mode: String(todayEntry.mode ?? "learn"),
          minutesPlanned: Number(todayEntry.minutes_planned ?? 45),
        });
      } else {
        setTodayPlan(null);
      }

      setWeekPlan(
        rows.map((row) => ({
          scheduledDate: String(row.scheduled_date ?? ""),
          topic: String(row.topic ?? ""),
          subtopic: String(row.subtopic ?? ""),
          mode: String(row.mode ?? "learn"),
          completed: Boolean(row.completed),
        })),
      );
    };

    void loadStudyPlan();
  }, [studentId]);

  const masteryBySubject = useMemo(() => subjectMastery, [subjectMastery]);
  const avatarLetter = studentName?.trim()?.charAt(0)?.toUpperCase() || "S";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setSaveMessage("");

    const { error } = await supabase.auth.updateUser({
      data: {
        name: studentName,
        child_name: childName,
        grade: childGrade,
        child_grade: childGrade,
      },
    });

    if (error) {
      setSaveMessage(error.message);
      setIsSavingProfile(false);
      return;
    }

    setSaveMessage("Profile saved successfully.");
    setIsSavingProfile(false);
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
        {targetGrade && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#E8F8F4",
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: "#189080",
              marginTop: 8,
            }}
          >
            🎯 Targeting Grade {targetGrade}
            {examSession && examYear ? ` · ${examSession} ${examYear}` : ""}
          </div>
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-orange-200 bg-white p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              trial.status === "Free Trial" ? "bg-orange-500 text-white" : "bg-red-600 text-white"
            }`}
          >
            {trial.status}
          </span>
          <span className="text-sm font-semibold text-slate-700">{trial.daysRemaining} days remaining</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-orange-100">
          <div
            className={`h-2 rounded-full ${trial.status === "Free Trial" ? "bg-orange-500" : "bg-red-600"}`}
            style={{ width: `${trial.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600">{Math.min(7, trial.daysElapsed)} of 7 trial days used</p>
        <Link
          href="/pricing"
          className="mt-3 inline-block rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Upgrade now
        </Link>
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
        {todayPlan ? (
          <>
            <p className="mt-2 text-sm text-slate-700">
              Today focus on: <span className="font-semibold">{todayPlan.topic}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">{todayPlan.subtopic}</p>
            <p className="mt-1 text-sm text-slate-600">
              Mode: <span className="font-medium capitalize">{todayPlan.mode.replace("_", " ")}</span> ·{" "}
              {todayPlan.minutesPlanned} min planned
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-700">
              Today focus on:{" "}
              <span className="font-semibold">
                {weakestTopic ? `${weakestTopic.topic} (${weakestTopic.mastery}% mastery)` : "No scheduled study today"}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-600">Suggested: 20 min lesson + 5 practice questions</p>
          </>
        )}
        <Link
          href={
            todayPlan
              ? `/tutor?subject=${encodeURIComponent(todayPlan.subject)}&topic=${encodeURIComponent(todayPlan.topic)}`
              : weakestTopic
                ? `/tutor?subject=${encodeURIComponent(weakestTopic.subject)}&topic=${encodeURIComponent(weakestTopic.topic)}`
                : "/tutor?subject=Chemistry&topic=Stoichiometry"
          }
          className="mt-3 inline-block rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Start today&apos;s plan
        </Link>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="heading-font text-xl font-semibold text-slate-900">This week&apos;s study plan</h3>
        {weekPlan.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No plan scheduled for this week yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {weekPlan.map((entry) => (
              <div
                key={`${entry.scheduledDate}-${entry.topic}-${entry.subtopic}`}
                className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {entry.scheduledDate} · {entry.topic}
                  </p>
                  <p className="text-xs text-slate-600">{entry.subtopic}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs capitalize text-teal-700">{entry.mode.replace("_", " ")}</p>
                  <p className={`text-xs ${entry.completed ? "text-green-600" : "text-slate-500"}`}>
                    {entry.completed ? "Completed" : "Planned"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="heading-font text-xl font-semibold text-slate-900">Student settings</h3>
        <div className="mt-3 grid gap-2">
          <input
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Your name"
          />
          <input value={userEmail} disabled className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Child name"
          />
          <select
            value={childGrade}
            onChange={(event) => setChildGrade(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select grade</option>
            {["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => void saveProfile()}
          disabled={isSavingProfile}
          className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isSavingProfile ? "Saving..." : "Save profile"}
        </button>
        {saveMessage && <p className="mt-2 text-sm text-slate-700">{saveMessage}</p>}
      </section>

      <BottomNav />
    </main>
  );
}
