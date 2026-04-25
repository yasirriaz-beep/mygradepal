"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import Logo from "@/components/Logo";

const subjects = [
  "Chemistry (0620)",
  "Physics (0625)",
  "Mathematics (0580)",
  "Biology (0610)",
  "English (0510)",
  "Pakistan Studies (0448)",
  "Islamiyat (0493)",
];

const PRICE_PER_SUBJECT = 5000;

export default function PricingPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const total = useMemo(() => selected.length * PRICE_PER_SUBJECT, [selected.length]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <Logo className="justify-center" />
        <h1 className="mt-5 text-center text-3xl font-bold text-slate-900">Choose your plan</h1>
        <p className="mt-2 text-center text-sm text-slate-600">Rs 5,000 per subject per month</p>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-800">Choose your subjects:</p>
          <div className="mt-3 space-y-2">
            {subjects.map((subject) => {
              const checked = selected.includes(subject);
              return (
                <label
                  key={subject}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">{subject}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSelected((prev) =>
                        event.target.checked ? [...prev, subject] : prev.filter((item) => item !== subject),
                      );
                    }}
                    className="h-4 w-4 accent-brand-teal"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-teal-50 px-4 py-3 text-center text-sm font-semibold text-slate-800">
          Total: Rs {total.toLocaleString()} / month
        </div>

        <div className="mt-6 rounded-2xl border border-teal-100 bg-[#f0f8f7] p-4">
          <p className="text-sm font-semibold text-slate-900">To subscribe contact us:</p>
          <a
            href="https://wa.me/92XXXXXXXXXX"
            target="_blank"
            rel="noreferrer"
            className="mt-3 block rounded-xl bg-[#25D366] px-4 py-2 text-center text-sm font-semibold text-white"
          >
            WhatsApp us
          </a>
          <p className="mt-3 text-sm text-slate-700">
            Email:{" "}
            <a href="mailto:hello@mygradepal.com" className="font-semibold text-brand-teal">
              hello@mygradepal.com
            </a>
          </p>
          <p className="mt-2 text-xs text-slate-600">We will activate your account within 2 hours.</p>
        </div>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-semibold text-brand-teal hover:underline">
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
