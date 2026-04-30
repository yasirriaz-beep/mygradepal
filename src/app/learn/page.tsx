"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import BottomNav from "@/components/BottomNav";

const gradeSubjects: Record<string, string[]> = {
  "Grade 6": ["Mathematics", "General Science", "English"],
  "Grade 7": ["Mathematics", "General Science", "English"],
  "Grade 8": ["Mathematics", "General Science", "English"],
  "Grade 9": ["Chemistry", "Physics", "Mathematics", "Biology"],
  "Grade 10": ["Chemistry", "Physics", "Mathematics"],
};

type LastTopic = {
  subject: string;
  topic: string;
};

export default function LearnPage() {
  const [lastTopic, setLastTopic] = useState<LastTopic | null>(null);
  const [grade, setGrade] = useState<keyof typeof gradeSubjects>("Grade 10");

  useEffect(() => {
    const saved = localStorage.getItem("lastLearnTopic");
    if (!saved) return;
    try {
      setLastTopic(JSON.parse(saved) as LastTopic);
    } catch {
      setLastTopic(null);
    }
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-[#F7F8FA] px-4 pb-24 pt-6 sm:px-6">
      <h1 className="heading-font text-3xl font-bold text-slate-900">What do you want to learn today?</h1>
      <section className="mt-4 rounded-2xl bg-white p-6 shadow-card">
        <p className="text-sm font-semibold text-slate-700">I am studying:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.keys(gradeSubjects).map((gradeOption) => (
            <button
              key={gradeOption}
              onClick={() => setGrade(gradeOption as keyof typeof gradeSubjects)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                grade === gradeOption ? "bg-brand-teal text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {gradeOption}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gradeSubjects[grade].map((subject) => (
          <article key={subject} className="rounded-2xl bg-white p-6 shadow-card">
            <p className="heading-font text-xl font-semibold text-slate-900">{subject}</p>
            <p className="mt-2 text-sm text-slate-600">Master key concepts with your Personal Tutor.</p>
            <Link
              href={`/study/${encodeURIComponent(subject.toLowerCase())}`}
              className="mt-4 inline-block rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Start learning
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="heading-font text-xl font-semibold text-slate-900">Continue learning</h2>
        {lastTopic ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{lastTopic.topic}</p>
              <p className="text-sm text-slate-600">{lastTopic.subject}</p>
            </div>
            <Link
              href={`/tutor?subject=${encodeURIComponent(lastTopic.subject)}&topic=${encodeURIComponent(lastTopic.topic)}`}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white"
            >
              Resume
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No recent learning yet. Pick a subject above.</p>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
