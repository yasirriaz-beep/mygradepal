"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

type TopicPrediction = {
  subject: string;
  topic: string;
  frequency_score: number;
  prediction_tier: string | null;
};

const subjects = ["Chemistry", "Physics", "Mathematics"];

const getBadge = (score: number) => {
  if (score >= 90) return { label: "🔥 Certain", className: "bg-red-100 text-red-700" };
  if (score >= 70) return { label: "⚡ Likely", className: "bg-amber-100 text-amber-700" };
  if (score >= 50) return { label: "✓ Possible", className: "bg-emerald-100 text-emerald-700" };
  return { label: "Low", className: "bg-slate-100 text-slate-600" };
};

export default function PredictPage() {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState("Chemistry");
  const [topics, setTopics] = useState<TopicPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPredictions = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("questions")
        .select("subject, topic, frequency_score, prediction_tier")
        .order("frequency_score", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setTopics([]);
        setIsLoading(false);
        return;
      }

      const unique = new Map<string, TopicPrediction>();
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const subject = String(row.subject ?? "");
        const topic = String(row.topic ?? "");
        if (!subject || !topic) continue;

        const score = Number(row.frequency_score ?? 0);
        const key = `${subject}::${topic}`;
        const existing = unique.get(key);
        if (!existing || score > existing.frequency_score) {
          unique.set(key, {
            subject,
            topic,
            frequency_score: score,
            prediction_tier: (row.prediction_tier as string) ?? null,
          });
        }
      }

      setTopics(
        Array.from(unique.values()).sort((a, b) => b.frequency_score - a.frequency_score),
      );
      setIsLoading(false);
    };

    void loadPredictions();
  }, []);

  const bySubject = useMemo(() => {
    return subjects.reduce<Record<string, TopicPrediction[]>>((acc, subject) => {
      acc[subject] = topics.filter((topic) => topic.subject === subject);
      return acc;
    }, {});
  }, [topics]);

  const handleGeneratePaper = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: selectedSubject }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate mock paper.");
      }

      sessionStorage.setItem("generatedMockPaper", JSON.stringify(data));
      router.push(`/mock-paper?subject=${encodeURIComponent(selectedSubject)}`);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Failed to generate predicted paper.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <h1 className="heading-font text-3xl font-bold text-slate-900">
        SmartPredict - What&apos;s coming in your exam
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Based on 15 years of Cambridge past paper analysis
      </p>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-card">
        <label className="text-sm font-medium text-slate-700" htmlFor="subjectSelect">
          Subject for predicted paper
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            id="subjectSelect"
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <button
            onClick={handleGeneratePaper}
            disabled={isGenerating}
            className="rounded-xl bg-brand-teal px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
          >
            {isGenerating ? "Generating..." : "Generate Predicted Paper"}
          </button>
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-600">Loading predictions...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 space-y-5">
        {subjects.map((subject) => (
          <article key={subject} className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="heading-font text-xl font-semibold text-slate-900">{subject}</h2>
            <div className="mt-3 space-y-2">
              {bySubject[subject]?.length ? (
                bySubject[subject].map((topic, index) => {
                  const badge = getBadge(topic.frequency_score);
                  const isLocked = index >= 3;
                  return (
                    <div
                      key={`${topic.subject}-${topic.topic}`}
                      className="relative flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{topic.topic}</p>
                        <div className={isLocked ? "select-none blur-[4px]" : ""}>
                          <p className="text-xs text-slate-500">Frequency score: {topic.frequency_score}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                        {isLocked ? (
                          <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            Locked
                          </span>
                        ) : (
                          <Link
                            href={`/practice?topic=${encodeURIComponent(topic.topic)}&subject=${encodeURIComponent(topic.subject)}`}
                            className="rounded-lg bg-brand-teal px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Practice this topic
                          </Link>
                        )}
                      </div>
                      {isLocked && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-white/25">
                          <div className="rounded-lg bg-white/95 px-3 py-2 text-center text-xs font-semibold text-slate-800 shadow">
                            🔒 Upgrade to unlock all predictions
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No prediction data yet.</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
