"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getTrialInfo } from "@/lib/trialStatus";

export default function ParentSettingsPage() {
  const [language, setLanguage] = useState<"English" | "Urdu">("English");
  const [reportsInUrdu, setReportsInUrdu] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [childName, setChildName] = useState("");
  const [childGrade, setChildGrade] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [trial, setTrial] = useState(() => getTrialInfo());
  const [alerts, setAlerts] = useState({
    completed: true,
    missed: true,
    struggling: true,
    weekly: true,
    examCountdown: true,
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "");
        setUserName(String(user.user_metadata?.name ?? ""));
        setChildName(String(user.user_metadata?.child_name ?? ""));
        setChildGrade(String(user.user_metadata?.grade ?? user.user_metadata?.child_grade ?? ""));
      }
    };
    getUser();
    setTrial(getTrialInfo());
  }, []);

  const saveProfile = async () => {
    setIsSaving(true);
    setSaveMessage("");

    const { error } = await supabase.auth.updateUser({
      data: {
        name: userName,
        child_name: childName,
        grade: childGrade,
        child_grade: childGrade,
      },
    });

    if (error) {
      setSaveMessage(error.message);
      setIsSaving(false);
      return;
    }

    setSaveMessage("Profile saved successfully.");
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Settings</h1>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Parent Profile</h2>
        <div className="mt-3 grid gap-2">
          <input
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="Parent name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={userEmail}
            disabled
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            defaultValue="+92 300 1234567"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => void saveProfile()}
          disabled={isSaving}
          className="mt-3 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save profile"}
        </button>
        {saveMessage && <p className="mt-2 text-sm text-slate-700">{saveMessage}</p>}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Child Profile</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            Child name
          </p>
          <input
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p>Grade</p>
          <select
            value={childGrade}
            onChange={(event) => setChildGrade(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select grade</option>
            {["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Subscription</h2>
        <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                trial.status === "Free Trial"
                  ? "bg-orange-500 text-white"
                  : "bg-red-600 text-white"
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
          <p className="mt-2 text-xs text-slate-600">
            {Math.min(7, trial.daysElapsed)} of 7 trial days used
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-block rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
          >
            Upgrade now
          </Link>
        </div>
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
