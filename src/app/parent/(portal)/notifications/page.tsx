"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";

type Notification = {
  id: string;
  type: "missed" | "completed" | "struggling";
  message: string;
  time: string;
  date: string;
  read: boolean;
};

const sampleNotifications: Notification[] = [
  {
    id: "1",
    type: "missed",
    time: "9:00 PM",
    date: "Today",
    message: "Ahmed missed today's session",
    read: false,
  },
  {
    id: "2",
    type: "completed",
    time: "8:12 PM",
    date: "Yesterday",
    message: "Ahmed completed session — 22 min, 8/10 questions correct",
    read: false,
  },
  {
    id: "3",
    type: "struggling",
    time: "7:45 PM",
    date: "2 days ago",
    message: "Ahmed struggling with Stoichiometry — 3 wrong answers in a row",
    read: false,
  },
  {
    id: "4",
    type: "completed",
    time: "8:05 PM",
    date: "3 days ago",
    message: "Ahmed completed session — 31 min, Chemistry",
    read: true,
  },
  {
    id: "5",
    type: "missed",
    time: "9:00 PM",
    date: "4 days ago",
    message: "Ahmed missed today's session",
    read: true,
  },
];

export default function ParentNotificationsPage() {
  const [items, setItems] = useState<Notification[]>(sampleNotifications);
  const [filter, setFilter] = useState<"all" | "missed" | "completed" | "struggling">("all");

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.type === filter);
  }, [filter, items]);

  const markAllRead = () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h1 className="heading-font text-2xl font-bold text-slate-900">Alerts &amp; Notifications</h1>
          <button
            onClick={markAllRead}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Mark all as read
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "missed", label: "Missed" },
            { id: "completed", label: "Completed" },
            { id: "struggling", label: "Struggling" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                filter === tab.id
                  ? "bg-brand-teal text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className={clsx(
                "rounded-xl border p-3",
                item.read ? "border-slate-200 bg-white" : "border-brand-teal bg-teal-50",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "mt-1 h-3 w-3 rounded-full",
                    item.type === "missed" && "bg-red-500",
                    item.type === "completed" && "bg-emerald-500",
                    item.type === "struggling" && "bg-amber-500",
                  )}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.date} {item.time ? `• ${item.time}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.message}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm text-slate-600">Notifications are sent to:</p>
        <p className="mt-1 text-lg font-bold text-slate-900">+92 300 xxxxxxx</p>
        <button className="mt-3 rounded-lg border border-brand-teal px-3 py-2 text-sm font-semibold text-brand-teal">
          Change number
        </button>
      </section>

      <section className="rounded-2xl bg-brand-teal p-4 text-white shadow-card">
        <p className="text-sm font-semibold">
          Sessions cannot be skipped without you knowing.
        </p>
      </section>
    </div>
  );
}
