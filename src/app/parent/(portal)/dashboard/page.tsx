"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { getTrialInfo } from "@/lib/trialStatus";

type DayStatus = "complete" | "missed" | "in_progress" | "rest";
type DashboardData = {
  childName: string;
  topAlert: {
    state: "not_started" | "in_progress" | "complete";
    title: string;
    subtitle: string;
    cta?: string;
  };
  disciplineScore: number;
  trend: number[];
  streakDays: number;
  longestStreak: number;
  weekCalendar: { day: string; status: DayStatus; target: number; actual: number }[];
};

const demo: DashboardData = {
  childName: "Ahmed",
  topAlert: {
    state: "not_started",
    title: "⚠️ Ahmed has not started today's session",
    subtitle:
      "Session window: 7:00 PM — 9:00 PM • Required: 45 minutes minimum • Time remaining: 1 hour 23 minutes",
    cta: "Send WhatsApp reminder now",
  },
  disciplineScore: 78,
  trend: [71, 75, 82, 78],
  streakDays: 7,
  longestStreak: 7,
  weekCalendar: [
    { day: "Mon", status: "complete", target: 45, actual: 24 },
    { day: "Tue", status: "missed", target: 45, actual: 0 },
    { day: "Wed", status: "complete", target: 45, actual: 31 },
    { day: "Thu", status: "in_progress", target: 45, actual: 12 },
    { day: "Fri", status: "rest", target: 0, actual: 0 },
    { day: "Sat", status: "complete", target: 45, actual: 22 },
    { day: "Sun", status: "complete", target: 45, actual: 25 },
  ],
};

function scoreLabel(score: number) {
  if (score >= 90) return "Excellent — very disciplined 🏆";
  if (score >= 70) return "Good — room to improve ⚡";
  if (score >= 50) return "Needs attention ⚠️";
  return "Urgent — please review schedule 🚨";
}

export default function ParentDashboardPage() {
  const [data, setData] = useState<DashboardData>(demo);
  const [trial, setTrial] = useState(() => getTrialInfo());
  const [sendingReminder, setSendingReminder] = useState(false);
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const authChildName = String(user.user_metadata?.child_name ?? "").trim();
        if (authChildName) {
          setData((prev) => ({
            ...prev,
            childName: authChildName,
            topAlert: {
              ...prev.topAlert,
              title: prev.topAlert.title.replace("Ahmed", authChildName),
            },
          }));
        }
      }

      try {
        const response = await fetch("/api/parent/dashboard");
        if (response.ok) setData((await response.json()) as DashboardData);
      } catch {
        // Keep demo data.
      }
      setTrial(getTrialInfo());
    };
    void load();
  }, []);

  const ringStyle = useMemo(
    () => ({ background: `conic-gradient(#189080 ${data.disciplineScore * 3.6}deg, #dbeafe 0deg)` }),
    [data.disciplineScore],
  );

  const sendReminder = async () => {
    setSendingReminder(true);
    try {
      await fetch("/api/parent/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: "demo-student", parentPhone: "+923001234567" }),
      });
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="space-y-4">
      <section
        className={clsx(
          "rounded-2xl p-4 shadow-card",
          trial.status === "Free Trial" ? "border border-orange-200 bg-orange-50" : "border border-red-200 bg-red-50",
        )}
      >
        <p className={clsx("font-semibold", trial.status === "Free Trial" ? "text-orange-700" : "text-red-700")}>
          {trial.status === "Free Trial"
            ? `Free Trial - ${trial.daysRemaining} days remaining. Upgrade to keep ${data.childName}'s sessions going after trial ends.`
            : `Free Trial ended. ${data.childName} cannot access new questions. Upgrade to continue.`}
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-block rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Upgrade now →
        </Link>
      </section>

      <section
        className={clsx(
          "rounded-2xl p-4 shadow-card",
          data.topAlert.state === "not_started" && "bg-red-600 text-white",
          data.topAlert.state === "in_progress" && "bg-emerald-600 text-white",
          data.topAlert.state === "complete" && "bg-brand-teal text-white",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              "mt-1 h-3 w-3 rounded-full",
              data.topAlert.state === "not_started" && "animate-pulse bg-white",
              data.topAlert.state === "in_progress" && "bg-white",
              data.topAlert.state === "complete" && "bg-white",
            )}
          />
          <div className="flex-1">
            <p className="text-lg font-bold">{data.topAlert.title}</p>
            <p className="mt-1 text-sm font-semibold text-white/95">{data.topAlert.subtitle}</p>
          </div>
        </div>
        {data.topAlert.cta ? (
          <button
            onClick={() => void sendReminder()}
            className="mt-3 rounded-lg border border-red-500 bg-white px-4 py-2 text-sm font-bold text-red-600"
          >
            {sendingReminder ? "Sending..." : data.topAlert.cta}
          </button>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="heading-font text-xl font-bold text-slate-900">Weekly Discipline Score</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-28 w-28 place-items-center rounded-full p-2" style={ringStyle}>
              <div className="grid h-full w-full place-items-center rounded-full bg-white text-2xl font-bold text-brand-teal">{data.disciplineScore}%</div>
            </div>
            <div>
              <p className="font-semibold text-amber-600">{scoreLabel(data.disciplineScore)}</p>
              <div className="mt-3 flex items-end gap-1">
                {data.trend.map((value, index) => (
                  <div key={`${value}-${index}`} className="w-3 rounded-sm bg-teal-200" style={{ height: `${Math.max(10, value / 2)}px` }} />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">Last 4 weeks</p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-white shadow-card">
          <h2 className="heading-font text-xl font-bold text-white">Streak Counter</h2>
          <p className="mt-3 text-4xl">🔥</p>
          <p className="text-3xl font-bold">{data.streakDays} day streak</p>
          <p className="text-sm font-semibold text-orange-100">
            {data.childName}&apos;s longest ever: {data.longestStreak} days
          </p>
          <p className="mt-3 text-xs text-orange-100">Sessions cannot be skipped without you knowing.</p>
        </article>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Daily calendar view</h2>
        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
          {data.weekCalendar.map((day) => (
            <div
              key={day.day}
              className={clsx(
                "rounded-xl p-2",
                day.status === "complete" && "bg-emerald-100 text-emerald-800",
                day.status === "missed" && "bg-red-100 text-red-800",
                day.status === "in_progress" && "bg-orange-100 text-orange-800",
                day.status === "rest" && "bg-slate-100 text-slate-600",
              )}
            >
              <p className="font-bold">{day.day}</p>
              <p className="mt-1 text-xl">
                {day.status === "complete" && "✅"}
                {day.status === "missed" && "❌"}
                {day.status === "in_progress" && "⏱"}
                {day.status === "rest" && "➖"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">This week vs target</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Day</th>
                <th className="py-2">Target</th>
                <th className="py-2">Actual</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.weekCalendar.map((day, index) => (
                <tr key={day.day} className={clsx("border-t border-slate-100", index % 2 === 0 ? "bg-slate-50/60" : "bg-white")}>
                  <td className="py-2 font-semibold">{day.day}</td>
                  <td className="py-2">{day.target} min</td>
                  <td className="py-2">{day.actual} min</td>
                  <td className="py-2">
                    {day.status === "complete" && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">✅ Complete</span>}
                    {day.status === "missed" && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">❌ Missed</span>}
                    {day.status === "in_progress" && <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">⏱ In progress</span>}
                    {day.status === "rest" && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">➖ Rest</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-brand-teal p-4 text-white shadow-card">
          <p className="text-2xl">📅</p>
          <p className="mt-2 text-sm font-semibold">Unlike a physical tutor who comes 3x a week, MyGradePal is here every single day.</p>
        </article>
        <article className="rounded-2xl bg-brand-teal p-4 text-white shadow-card">
          <p className="text-2xl">⏱</p>
          <p className="mt-2 text-sm font-semibold">You see every minute {data.childName} studies — in real time.</p>
        </article>
        <article className="rounded-2xl bg-brand-teal p-4 text-white shadow-card">
          <p className="text-2xl">🛡️</p>
          <p className="mt-2 text-sm font-semibold">More accountable than any tutor you have ever hired.</p>
        </article>
      </section>
    </div>
  );
}
