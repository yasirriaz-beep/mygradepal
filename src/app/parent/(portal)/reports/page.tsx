"use client";

import { useState } from "react";

const weeklySummaries = [
  {
    weekOf: "21 Apr 2026",
    daysStudied: "5/7",
    totalTime: "2hrs 40min",
    averageScore: "67%",
    topicsCovered: "Stoichiometry, Bonding, Rates of reaction",
    improvement: "+8%",
  },
  {
    weekOf: "14 Apr 2026",
    daysStudied: "4/7",
    totalTime: "2hrs 18min",
    averageScore: "62%",
    topicsCovered: "Forces, Chemical reactions, Algebra",
    improvement: "+5%",
  },
  {
    weekOf: "07 Apr 2026",
    daysStudied: "6/7",
    totalTime: "3hrs 05min",
    averageScore: "71%",
    topicsCovered: "Organic chemistry, Electricity, Geometry",
    improvement: "+10%",
  },
  {
    weekOf: "31 Mar 2026",
    daysStudied: "5/7",
    totalTime: "2hrs 51min",
    averageScore: "64%",
    topicsCovered: "Acids and bases, Kinematics, Ratios",
    improvement: "+3%",
  },
];

const subjectMastery = [
  { subject: "Chemistry", mastery: 58 },
  { subject: "Physics", mastery: 61 },
  { subject: "Mathematics", mastery: 74 },
];

export default function ParentReportsPage() {
  const [toast, setToast] = useState("");

  const showComingSoon = () => {
    setToast("Coming soon");
    setTimeout(() => setToast(""), 1800);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Progress Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Weekly accountability summaries for Ahmed&apos;s learning journey.
        </p>
      </section>

      <section className="space-y-3">
        {weeklySummaries.map((summary) => (
          <article key={summary.weekOf} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Week of {summary.weekOf}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Days studied: <span className="font-semibold">{summary.daysStudied}</span>
                </p>
              </div>
              <button
                onClick={showComingSoon}
                className="rounded-lg border border-brand-teal px-3 py-2 text-xs font-semibold text-brand-teal"
              >
                Download PDF
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <p>
                Total time: <span className="font-semibold">{summary.totalTime}</span>
              </p>
              <p>
                Average score: <span className="font-semibold">{summary.averageScore}</span>
              </p>
              <p>
                vs previous:{" "}
                <span className="font-semibold text-emerald-700">
                  {summary.improvement} improvement
                </span>
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Topics covered: <span className="font-semibold">{summary.topicsCovered}</span>
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Subject breakdown</h2>
        <div className="mt-3 space-y-3">
          {subjectMastery.map((item) => (
            <div key={item.subject}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">{item.subject}</span>
                <span className="font-bold text-brand-teal">{item.mastery}% mastery</span>
              </div>
              <div className="h-2 rounded-full bg-teal-100">
                <div
                  className="h-2 rounded-full bg-brand-teal"
                  style={{ width: `${item.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
