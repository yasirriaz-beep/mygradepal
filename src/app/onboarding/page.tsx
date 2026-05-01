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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState<string>("");
  const [session, setSession] = useState<SessionOption>("May/June");
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear() + 1);
  const [targetGrade, setTargetGrade] = useState<GradeOption | "">("");
  const [daysPerWeek] = useState<number>(5);
  const selectedSession = session;
  const [studyMode, setStudyMode] = useState<"guided" | "free">("guided");
  const [videoScriptOpen, setVideoScriptOpen] = useState(false);

  const examDate = useMemo(() => getExamDate(session, examYear), [session, examYear]);
  const daysRemaining = useMemo(() => getDaysRemaining(examDate), [examDate]);
  const progressStep = Math.min(step, 4);
  const years = useMemo(() => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i), []);

  const canContinue =
    (step === 1 && subject === "Chemistry 0620") ||
    (step === 2 && Boolean(session) && Boolean(examYear)) ||
    (step === 3 && Boolean(targetGrade));

  const handleBack = () => setStep((s) => Math.max(1, s - 1));
  const handleNext = () => {
    if (step === 3) {
      setStep(4);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const persistStudyMode = async (mode: "guided" | "free") => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_profiles").upsert({ user_id: user.id, study_mode: mode }, { onConflict: "user_id" });
    } catch {
      // non-blocking persistence for mode selection
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Step {progressStep} of 4</span>
            <span>{Math.round((progressStep / 4) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{ width: `${(progressStep / 4) * 100}%` }}
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
                onClick={() => {
                  setStudyMode("guided");
                  void persistStudyMode("guided");
                  const params = new URLSearchParams({
                    session: selectedSession || "May/June",
                    examYear: String(examYear || 2027),
                    daysPerWeek: String(daysPerWeek || 5),
                    targetGrade: targetGrade || "A",
                  });
                  router.push(`/onboarding/study-plan?${params.toString()}`);
                }}
                className={`relative rounded-xl border p-5 text-left transition ${
                  studyMode === "guided"
                    ? "scale-[1.01] border-teal-400 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white"
                } cursor-pointer`}
              >
                <span className="text-2xl">📅</span>
                <p className="mt-2 text-base font-semibold text-slate-900">Follow my plan</p>
                <p className="mt-1 text-sm text-slate-600">
                  We plan every day for you. Just open the app and follow today&apos;s task. Best for most students.
                </p>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-700">
                  {"✓ Daily tasks assigned automatically\n✓ Progress tracked every session\n✓ Parents notified if you miss a day\n✓ Plan adjusts as you improve"}
                </p>
                <span className="absolute right-3 top-3 rounded-full bg-teal-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Recommended
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudyMode("free");
                  void persistStudyMode("free");
                  router.push("/learn");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  studyMode === "free" ? "border-slate-400 bg-slate-50 shadow-sm" : "border-slate-200 bg-white"
                } cursor-pointer`}
              >
                <span className="text-2xl">🧭</span>
                <p className="mt-2 text-base font-semibold text-slate-900">I&apos;ll navigate myself</p>
                <p className="mt-1 text-sm text-slate-600">
                  Browse topics freely. Best if you&apos;re self-disciplined or need to strengthen specific areas.
                </p>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-700">
                  {"✓ Browse all 12 Chemistry topics freely\n✓ Jump to any past paper question\n✓ Platform tracks weak areas\n✓ Switch to guided plan anytime"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  You can switch to a guided plan anytime from your dashboard settings.
                </p>
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-base font-semibold text-slate-900">See how MyGradePal works (2 min)</p>
              <p className="mt-1 text-sm text-slate-600">
                Watch this before you start - it will save you hours of confusion
              </p>
              <button
                type="button"
                onClick={() => setVideoScriptOpen((prev) => !prev)}
                className="mt-3 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700"
              >
                See video script →
              </button>

              {videoScriptOpen && (
                <div className="mt-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 p-3">
                  <p className="mb-2 text-xs font-semibold text-teal-700">🎬 Video script ready — recording coming soon</p>
                  <p className="mb-2 text-xs font-semibold text-slate-700">📋</p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700">{`--- Video Script (coming soon) ---

[SCENE 1 - 0:00-0:20]
Show a parent looking stressed at their
child's report card. Voice over:
'Every Pakistani parent wants their child
to do well in O Levels. But between school,
academies, and tutors — it's expensive,
exhausting, and you still don't know if
your child is actually learning.'

[SCENE 2 - 0:20-0:45]
Show MyGradePal dashboard on phone/laptop.
'MyGradePal gives your child a complete
study system — and gives YOU full visibility.
Every session tracked. Every topic covered.
Every missed day — you know instantly.'

[SCENE 3 - 0:45-1:15]
Show student going through a question,
self-marking, seeing progress ring fill up.
'5,200 real Cambridge past paper questions.
Organised by topic. With full mark schemes.
Your child practices exactly what Cambridge
will test — nothing more, nothing less.'

[SCENE 4 - 1:15-1:40]
Show the 3-pass plan cards.
'We plan every day for your child.
Follow the plan — Pass 1 to learn,
Pass 2 to practice, Pass 3 to master.
By exam day, they have seen everything.'

[SCENE 5 - 1:40-2:00]
Show parent receiving WhatsApp report.
'Start your free trial today.
No credit card. No commitment.
Just results.'
---`}</pre>
                </div>
              )}
            </div>

          </section>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 1 && step <= 4 ? (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 4 && (
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
