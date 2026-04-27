"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

type PlanRow = {
  subject: string;
  topic: string;
  subtopic: string;
  scheduled_date: string;
  week_number: number | null;
  day_number: number | null;
  mode: string;
  priority: string | null;
  completed: boolean | null;
};

function rowKey(r: PlanRow): string {
  return `${r.scheduled_date}|${r.subject}|${r.topic}|${r.subtopic}|${r.mode}`;
}

export default function StudyPlanPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [defaultSubject, setDefaultSubject] = useState("Chemistry");
  const [subjectFilter, setSubjectFilter] = useState("Chemistry");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      setStudentId(user.id);

      const { data: student } = await supabase
        .from("students")
        .select("onboarding_subject")
        .eq("id", user.id)
        .single();

      const sub = String(student?.onboarding_subject ?? "Chemistry");
      setDefaultSubject(sub);
      setSubjectFilter(sub);

      const { data: planData, error: planError } = await supabase
        .from("study_plan")
        .select("subject, topic, subtopic, scheduled_date, week_number, day_number, mode, priority, completed")
        .eq("student_id", user.id)
        .order("scheduled_date", { ascending: true })
        .order("day_number", { ascending: true });

      if (planError) {
        setError(planError.message);
        setRows([]);
      } else {
        setRows((planData as PlanRow[]) ?? []);
      }

      setReady(true);
    };

    void load();
  }, [router]);

  const subjects = useMemo(() => {
    const set = new Set(rows.map((r) => r.subject).filter(Boolean));
    if (set.size === 0) set.add(defaultSubject);
    return Array.from(set).sort();
  }, [rows, defaultSubject]);

  const filtered = useMemo(
    () => rows.filter((r) => !subjectFilter || r.subject === subjectFilter),
    [rows, subjectFilter],
  );

  const toggleComplete = async (row: PlanRow) => {
    if (!studentId) return;
    const key = rowKey(row);
    const next = !row.completed;
    setSavingKey(key);
    setError("");

    const { error: upErr } = await supabase
      .from("study_plan")
      .update({ completed: next })
      .eq("student_id", studentId)
      .eq("subject", row.subject)
      .eq("scheduled_date", row.scheduled_date)
      .eq("topic", row.topic)
      .eq("subtopic", row.subtopic)
      .eq("mode", row.mode);

    if (upErr) {
      setError(upErr.message);
      setSavingKey(null);
      return;
    }

    const historyEntry = {
      at: new Date().toISOString(),
      action: "toggle_completed",
      plan_row_id: null,
      scheduled_date: row.scheduled_date,
      subject: row.subject,
      topic: row.topic,
      subtopic: row.subtopic,
      mode: row.mode,
      completed: next,
    };

    const res = await fetch("/api/study-plan/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        subject: row.subject,
        entry: historyEntry,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(String(payload.error ?? "Could not save edit history"));
    }

    setRows((prev) => prev.map((r) => (rowKey(r) === key ? { ...r, completed: next } : r)));
    setSavingKey(null);
  };

  if (!ready) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <p className="text-sm text-slate-600">Loading your study plan…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <Logo className="text-2xl" />
        <Link href="/dashboard" className="text-sm font-semibold text-brand-teal hover:underline">
          ← Dashboard
        </Link>
      </header>

      <section className="mb-4">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Full study plan</h1>
        <p className="mt-1 text-sm text-slate-600">Scheduled sessions from onboarding. Mark items done as you go.</p>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <label className="text-sm font-medium text-slate-700" htmlFor="subject-filter">
          Subject
        </label>
        <select
          id="subject-filter"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Subtopic</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    No rows in <span className="font-medium">{subjectFilter}</span> yet. Finish onboarding or regenerate
                    your plan.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={rowKey(row)} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-800">{row.scheduled_date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.topic}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{row.subtopic}</td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize text-teal-800">
                      {String(row.mode ?? "").replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={savingKey === rowKey(row)}
                        onClick={() => void toggleComplete(row)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          row.completed
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        } disabled:opacity-60`}
                      >
                        {savingKey === rowKey(row) ? "…" : row.completed ? "Completed" : "Mark done"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/tutor?subject=${encodeURIComponent(row.subject)}&topic=${encodeURIComponent(row.topic)}`}
                        className="text-xs font-semibold text-brand-teal hover:underline"
                      >
                        Tutor →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
