"use client";

import { useState } from "react";

export default function ParentSettingsPage() {
  const [language, setLanguage] = useState<"English" | "Urdu">("English");
  const [reportsInUrdu, setReportsInUrdu] = useState(false);
  const [alerts, setAlerts] = useState({
    completed: true,
    missed: true,
    struggling: true,
    weekly: true,
    examCountdown: true,
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Settings</h1>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Parent Profile</h2>
        <div className="mt-3 grid gap-2">
          <input
            defaultValue="Mrs. Hassan"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            defaultValue="mrs.hassan@email.com"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            defaultValue="+92 300 1234567"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white">
          Save changes
        </button>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h2 className="heading-font text-xl font-bold text-slate-900">Child Profile</h2>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
            Edit
          </button>
        </div>
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p>
            Child name: <span className="font-semibold">Ahmed Hassan</span>
          </p>
          <p>
            Grade: <span className="font-semibold">Grade 10</span>
          </p>
          <p>
            School: <span className="font-semibold">DHA Lahore School</span>
          </p>
          <p>
            Subjects enrolled:{" "}
            <span className="font-semibold">Chemistry, Physics, Mathematics</span>
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Subscription</h2>
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p>
            Plan: <span className="font-semibold">Standard — Rs 5,000/month</span>
          </p>
          <p>
            Status: <span className="font-semibold text-emerald-700">Active ✅</span>
          </p>
          <p>
            Next renewal: <span className="font-semibold">25 May 2026</span>
          </p>
        </div>
        <button className="mt-3 rounded-lg border border-brand-teal px-3 py-2 text-sm font-semibold text-brand-teal">
          Manage subscription
        </button>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Notifications</h2>
        <div className="mt-3 space-y-2">
          {[
            { key: "completed", label: "Session completed alerts" },
            { key: "missed", label: "Session missed alerts" },
            { key: "struggling", label: "Struggling detected alerts" },
            { key: "weekly", label: "Weekly Sunday report" },
            { key: "examCountdown", label: "Exam countdown reminders" },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-800">{item.label}</span>
              <input
                type="checkbox"
                checked={alerts[item.key as keyof typeof alerts]}
                onChange={() =>
                  setAlerts((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof typeof alerts],
                  }))
                }
                className="h-4 w-4 accent-brand-teal"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Language</h2>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setLanguage("English")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              language === "English"
                ? "bg-brand-teal text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("Urdu")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              language === "Urdu"
                ? "bg-brand-teal text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            اردو
          </button>
        </div>
        <label className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <span className="text-sm font-medium text-slate-800">Reports in Urdu</span>
          <input
            type="checkbox"
            checked={reportsInUrdu}
            onChange={() => setReportsInUrdu((v) => !v)}
            className="h-4 w-4 accent-brand-teal"
          />
        </label>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Account</h2>
        <div className="mt-3 flex gap-2">
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Change password
          </button>
          <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}
