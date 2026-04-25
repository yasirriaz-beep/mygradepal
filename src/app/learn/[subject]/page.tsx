"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

type TopicCard = {
  topic: string;
  subtopics: number;
  frequencyScore: number;
  mastery: number;
};

const getPredictBadge = (score: number) => {
  if (score >= 90) return { text: "🔥 Certain", style: "bg-red-100 text-red-700" };
  if (score >= 70) return { text: "⚡ Likely", style: "bg-amber-100 text-amber-700" };
  return { text: "✓ Possible", style: "bg-emerald-100 text-emerald-700" };
};

export default function LearnSubjectPage() {
  const params = useParams<{ subject: string }>();
  const subject = decodeURIComponent(params.subject);
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewLoadingTopic, setPreviewLoadingTopic] = useState<string | null>(null);
  const [speakingTopic, setSpeakingTopic] = useState<string | null>(null);

  useEffect(() => {
    const loadTopics = async () => {
      setIsLoading(true);
      setError(null);

      const [questionsResult, scoresResult] = await Promise.all([
        supabase.from("questions").select("*").eq("subject", subject),
        supabase.from("topic_scores").select("*").eq("student_id", "demo-student").eq("subject", subject),
      ]);

      if (questionsResult.error) {
        setError(questionsResult.error.message);
        setTopics([]);
        setIsLoading(false);
        return;
      }

      const masteryByTopic = new Map<string, number>();
      for (const row of (scoresResult.data ?? []) as Array<Record<string, unknown>>) {
        const topicName = String((row.topic as string) ?? "");
        if (!topicName) continue;
        const value = Number((row.mastery as number) ?? (row.score_percent as number) ?? 0);
        masteryByTopic.set(topicName, Math.min(100, Math.max(0, Math.round(value))));
      }

      const grouped = new Map<string, TopicCard>();
      for (const row of (questionsResult.data ?? []) as Array<Record<string, unknown>>) {
        const topic = String((row.topic as string) ?? (row.topic_name as string) ?? "General");
        const subtopic = String((row.subtopic as string) ?? (row.sub_topic as string) ?? "");
        const frequencyScore = Number((row.frequency_score as number) ?? 0);

        const existing = grouped.get(topic);
        if (existing) {
          existing.subtopics += subtopic ? 1 : 0;
          existing.frequencyScore = Math.max(existing.frequencyScore, frequencyScore);
        } else {
          grouped.set(topic, {
            topic,
            subtopics: subtopic ? 1 : 0,
            frequencyScore,
            mastery: masteryByTopic.get(topic) ?? 0,
          });
        }
      }

      const cards = Array.from(grouped.values()).sort((a, b) => a.mastery - b.mastery);
      setTopics(cards);
      setIsLoading(false);
    };

    void loadTopics();
  }, [subject]);

  const heading = useMemo(() => `${subject} learning topics`, [subject]);

  const playPreview = async (topicName: string) => {
    if (speakingTopic === topicName) {
      window.speechSynthesis.cancel();
      setSpeakingTopic(null);
      return;
    }

    setPreviewLoadingTopic(topicName);
    try {
      const response = await fetch("/api/tutor-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic: topicName,
          studentId: "demo-student",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not load preview.");
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(data.message ?? ""));
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.onend = () => setSpeakingTopic(null);
      utterance.onerror = () => setSpeakingTopic(null);
      setSpeakingTopic(topicName);
      window.speechSynthesis.speak(utterance);
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : "Could not load preview.";
      setError(message);
    } finally {
      setPreviewLoadingTopic(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <h1 className="heading-font text-3xl font-bold text-slate-900">{heading}</h1>

      {isLoading && <p className="mt-4 text-sm text-slate-600">Loading topics...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="heading-font text-lg font-semibold text-slate-900">Topic navigator</h2>
          <p className="mt-1 text-xs text-slate-500">Weak topics first</p>
          <div className="mt-3 space-y-2">
            {topics.map((topicCard) => (
              <Link
                key={`nav-${topicCard.topic}`}
                href={`/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topicCard.topic)}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-teal"
              >
                <span className="font-medium text-slate-800">{topicCard.topic}</span>
                <span className="font-semibold text-brand-teal">{topicCard.mastery}%</span>
              </Link>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          {topics.map((topicCard) => {
            const badge = getPredictBadge(topicCard.frequencyScore);
            const isOpen = expanded[topicCard.topic] ?? false;
            return (
              <article key={topicCard.topic} className="rounded-2xl bg-white p-4 shadow-card">
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [topicCard.topic]: !isOpen }))}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{topicCard.topic}</p>
                    <p className="text-sm text-slate-600">
                      {topicCard.subtopics} subtopics • Mastery {topicCard.mastery}%
                    </p>
                  </div>
                  <span className="text-sm text-slate-500">{isOpen ? "Hide" : "Show"}</span>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2 rounded-xl border border-slate-100 p-3">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.style}`}>
                      {badge.text}
                    </span>
                    <div className="pt-1">
                      <Link
                        href={`/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topicCard.topic)}`}
                        className="inline-block rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
                      >
                        Learn this topic
                      </Link>
                      <button
                        onClick={() => void playPreview(topicCard.topic)}
                        className={`ml-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                          speakingTopic === topicCard.topic
                            ? "animate-pulse bg-brand-orange text-white"
                            : "bg-teal-50 text-brand-teal"
                        }`}
                      >
                        {previewLoadingTopic === topicCard.topic
                          ? "Loading..."
                          : speakingTopic === topicCard.topic
                            ? "Stop preview"
                            : "🔊 Listen to overview"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
