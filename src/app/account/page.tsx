"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];

export default function AccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [grade, setGrade] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [examSession, setExamSession] = useState("");
  const [examYear, setExamYear] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const meta = user.user_metadata ?? {};
      const fallbackName =
        meta.child_name && meta.child_name !== "###"
          ? String(meta.child_name)
          : meta.name && meta.name !== "###"
            ? String(meta.name)
            : user.email?.split("@")[0] ?? "Student";

      const { data: row } = await supabase
        .from("students")
        .select("name, grade, target_grade, exam_session, exam_year")
        .eq("id", user.id)
        .maybeSingle();

      setChildName(String(row?.name ?? fallbackName));
      setGrade(String(row?.grade ?? meta.grade ?? meta.child_grade ?? ""));
      setTargetGrade(String(row?.target_grade ?? ""));
      setExamSession(String(row?.exam_session ?? ""));
      setExamYear(row?.exam_year != null ? Number(row.exam_year) : null);

      setReady(true);
    };

    void load();
  }, [router]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setMessage("");

    const trimmed = childName.trim();
    if (!trimmed) {
      setMessage("Please enter a name.");
      setSaving(false);
      return;
    }

    const { error: authErr } = await supabase.auth.updateUser({
      data: {
        child_name: trimmed,
        name: trimmed,
        grade,
        child_grade: grade,
      },
    });

    if (authErr) {
      setMessage(authErr.message);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("students").upsert(
      {
        id: userId,
        email,
        name: trimmed,
        grade: grade || null,
        target_grade: targetGrade || null,
        exam_session: examSession || null,
        exam_year: examYear,
      },
      { onConflict: "id" },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Saved successfully.");
    setSaving(false);
  };

  if (!ready) {
    return (
      <main className="body-font mx-auto min-h-screen max-w-lg px-4 pb-28 pt-6">
        <p className="text-sm text-slate-600">Loading account…</p>
      </main>
    );
  }

  return (
    <main className="body-font mx-auto min-h-screen max-w-lg px-4 pb-28 pt-4 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
      </div>

      <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-card">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-600">Update your profile. Exam targets are set during onboarding.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="child-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </label>
            <input
              id="child-name"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-brand-teal transition focus:ring-2"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              id="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            />
          </div>

          <div>
            <label htmlFor="grade" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Grade
            </label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-brand-teal transition focus:ring-2"
            >
              <option value="">Select grade</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target grade</p>
            <p className="mt-1 text-sm font-semibold text-brand-teal">{targetGrade || "—"}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exam session</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {examSession && examYear != null ? `${examSession} ${examYear}` : "—"}
            </p>
          </div>
        </div>

        {message && (
          <p
            className={`mt-4 rounded-xl px-3 py-2 text-sm ${message.includes("Saved") ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}
            role="status"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal-dark disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </section>

      <BottomNav />
    </main>
  );
}
