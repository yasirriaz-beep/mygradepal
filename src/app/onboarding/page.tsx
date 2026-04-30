"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GradeOption = "A*" | "A" | "B" | "C" | "D" | "Just Pass";
type SessionOption = "May/June" | "Oct/Nov";

const SUBJECTS = [
  { id: "chemistry", label: "Chemistry 0620", active: true, paperCode: "P2/P4/P6", questions: "4,200+ questions" },
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
  session_duration: (typeof SESSION_DURATIONS)[number];
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

  const examDate = useMemo(() => getExamDate(session, examYear), [session, examYear]);
  const daysRemaining = useMemo(() => getDaysRemaining(examDate), [examDate]);
  const tier = useMemo(() => getTier(daysRemaining), [daysRemaining]);
  const tierMessage = useMemo(() => getTierMessage(tier), [tier]);
  const progressStep = Math.min(step, 5);
  const years = useMemo(() => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i), []);
  const previewDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );

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
        session_duration: sessionDuration,
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
            <h1 className="text-2xl font-semibold text-slate-900">Your study tier is ready</h1>
            <p className="mt-2 text-sm text-slate-600">Tier {tier}</p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">{tierMessage}</div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-700">Your next 7 days (preview)</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {previewDates.map((date) => (
                  <div key={date.toISOString()} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-800">
                      {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p className="mt-1 text-slate-600">Session: Topic review + practice set</p>
                  </div>
                ))}
              </div>
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
