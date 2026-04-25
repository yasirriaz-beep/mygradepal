"use client";

import { useMemo, useState } from "react";

type Day = {
  key: string;
  label: string;
  active: boolean;
  start: number;
  end: number;
  topic: string;
  duration: number;
};

const initialDays: Day[] = [
  { key: "Mon", label: "Mon", active: true, start: 19, end: 21, topic: "Stoichiometry", duration: 45 },
  { key: "Tue", label: "Tue", active: true, start: 19, end: 21, topic: "Bonding", duration: 45 },
  { key: "Wed", label: "Wed", active: true, start: 19, end: 21, topic: "Organic Chemistry", duration: 45 },
  { key: "Thu", label: "Thu", active: true, start: 19, end: 21, topic: "Electricity", duration: 45 },
  { key: "Fri", label: "Fri", active: true, start: 19, end: 21, topic: "Algebra", duration: 45 },
  { key: "Sat", label: "Sat", active: false, start: 10, end: 12, topic: "Revision", duration: 60 },
  { key: "Sun", label: "Sun", active: false, start: 10, end: 12, topic: "Past paper", duration: 60 },
];

const toDisplay = (hour: number) => `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;

export default function ParentSchedulePage() {
  const [days, setDays] = useState(initialDays);
  const [minDuration, setMinDuration] = useState(45);
  const [minQuestions, setMinQuestions] = useState(5);
  const [dailyTopicsOn, setDailyTopicsOn] = useState(true);
  const [enforcement, setEnforcement] = useState<"A" | "B" | "C">("C");
  const [sameEveryDay, setSameEveryDay] = useState(true);

  const weeklySummary = useMemo(
    () => `${days.filter((d) => d.active).length} active days • ${minDuration} min • ${minQuestions} questions`,
    [days, minDuration, minQuestions],
  );

  const updateDay = (index: number, patch: Partial<Day>) => {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  const applyDurationToAllDays = (value: number) => {
    setMinDuration(value);
    setDays((prev) =>
      prev.map((day, idx) => {
        if (sameEveryDay) return { ...day, duration: value };
        if (idx <= 4) return { ...day, duration: value };
        return day;
      }),
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h1 className="heading-font text-2xl font-bold text-slate-900">Study Schedule — Keep Ahmed on track</h1>
        <p className="mt-1 text-sm text-slate-600">Set when Ahmed must study. We enforce it.</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-teal">{weeklySummary}</p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Schedule builder</h2>
        <div className="mt-3 grid gap-3">
          {days.map((day, index) => (
            <article key={day.key} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">{day.label}</p>
                <label className="text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={day.active}
                    onChange={(event) => updateDay(index, { active: event.target.checked })}
                    className="mr-2 h-4 w-4 accent-brand-teal"
                  />
                  Active
                </label>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Must study between <span className="font-semibold">{toDisplay(day.start)}</span> and{" "}
                <span className="font-semibold">{toDisplay(day.end)}</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input type="range" min={6} max={22} value={day.start} onChange={(e) => updateDay(index, { start: Number(e.target.value) })} />
                <input type="range" min={7} max={23} value={day.end} onChange={(e) => updateDay(index, { end: Math.max(Number(e.target.value), day.start + 1) })} />
              </div>
              <p className="mt-2 text-sm text-slate-700">
                For at least{" "}
                <span className="font-semibold">{sameEveryDay ? minDuration : day.duration}</span> minutes
              </p>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Daily session length</p>
            <label className="text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={sameEveryDay}
                onChange={(event) => setSameEveryDay(event.target.checked)}
                className="mr-2 h-4 w-4 accent-brand-teal"
              />
              Same every day
            </label>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Current default: <span className="font-semibold">{minDuration} min</span>
          </p>
          <input
            type="range"
            min={30}
            max={90}
            step={5}
            value={minDuration}
            onChange={(e) => applyDurationToAllDays(Number(e.target.value))}
            className="mt-2 w-full accent-brand-teal"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[30, 45, 60, 90].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyDurationToAllDays(preset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  minDuration === preset ? "bg-brand-teal text-white" : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {preset} min
              </button>
            ))}
          </div>

          {!sameEveryDay ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Set separate duration per day
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {days.map((day, index) => (
                  <label key={day.key} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs">
                    <span className="mb-1 block font-semibold text-slate-800">{day.label}</span>
                    <select
                      value={day.duration}
                      onChange={(event) => updateDay(index, { duration: Number(event.target.value) })}
                      className="w-full rounded-md border border-slate-300 px-1 py-1 text-xs"
                    >
                      {[30, 45, 60, 90].map((option) => (
                        <option key={option} value={option}>
                          {option} min
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-brand-teal bg-teal-50 p-4 shadow-card">
        <h2 className="heading-font text-xl font-bold text-slate-900">Enforcement settings</h2>
        <p className="mt-2 text-sm font-semibold text-slate-800">What happens if Ahmed does not start on time?</p>
        <div className="mt-2 space-y-2 text-sm">
          {[
            { id: "A" as const, label: "Option A: Send me a WhatsApp reminder at session start time" },
            { id: "B" as const, label: "Option B: Lock Ahmed's phone (show study lock screen)" },
            { id: "C" as const, label: "Option C: Both A and B" },
          ].map((option) => (
            <label key={option.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <input type="radio" name="enforcement" checked={enforcement === option.id} onChange={() => setEnforcement(option.id)} className="mt-1 accent-brand-teal" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">Requires installing MyGradePal app for Study Lock.</p>

        <p className="mt-4 text-sm font-semibold text-slate-800">What counts as a valid session?</p>
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm">Must answer at least <span className="font-semibold">{minQuestions}</span> questions</p>
          <input type="range" min={1} max={20} value={minQuestions} onChange={(e) => setMinQuestions(Number(e.target.value))} className="mt-2 w-full accent-brand-teal" />
          <p className="mt-3 text-sm">
            Must spend at least <span className="font-semibold">{minDuration}</span> minutes active (not idle)
          </p>
          <input
            type="range"
            min={30}
            max={90}
            step={5}
            value={minDuration}
            onChange={(e) => applyDurationToAllDays(Number(e.target.value))}
            className="mt-2 w-full accent-brand-teal"
          />
          <p className="mt-3 text-sm font-semibold">Must cover the assigned topic for today</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="heading-font text-xl font-bold text-slate-900">Daily assigned topics</h2>
          <label className="text-sm font-semibold">
            <input type="checkbox" checked={dailyTopicsOn} onChange={() => setDailyTopicsOn((v) => !v)} className="mr-2 h-4 w-4 accent-brand-teal" />
            {dailyTopicsOn ? "ON" : "OFF"}
          </label>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {dailyTopicsOn ? "Parent assigns a specific topic each day." : "Student chooses their own topic."}
        </p>
        {dailyTopicsOn ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {days.map((day, index) => (
              <label key={day.key} className="rounded-lg border border-slate-200 p-2 text-sm">
                <span className="block font-semibold">{day.label}</span>
                <input
                  value={day.topic}
                  onChange={(event) => updateDay(index, { topic: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                />
              </label>
            ))}
          </div>
        ) : null}
        <button className="mt-4 rounded-xl bg-brand-teal px-5 py-3 font-semibold text-white">Save discipline schedule</button>
      </section>
    </div>
  );
}
