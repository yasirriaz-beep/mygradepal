"use client";

import Link from "next/link";
import { Mic, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "@/components/BottomNav";
import LearnContent from "@/components/LearnContent";
import { supabase } from "@/lib/supabase";
import { startSession as startStudySession, updateSession } from "@/lib/studySessionClient";
import { getTrialUsage, TRIAL_LIMITS } from "@/lib/trialLimits";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type LessonStep = "explain" | "formulas" | "example" | "test" | "past-paper";

const lessonSteps: Array<{ key: LessonStep; label: string }> = [
  { key: "explain", label: "Explain" },
  { key: "formulas", label: "Formulas" },
  { key: "example", label: "Example" },
  { key: "test", label: "Test" },
  { key: "past-paper", label: "Past Paper" },
];

type StaticTopicContent = {
  definition: string;
  key_points: string[];
  formulas: { formula: string; variables: string }[];
  worked_example: { question: string; steps: string[]; answer: string; takeaway: string } | null;
  exam_tip: string;
  quick_check: string;
  urdu_summary: string;
  audio_url_en: string | null;
  audio_url_ur: string | null;
};

function TutorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject") ?? "Chemistry";
  const topic = searchParams.get("topic") ?? "General";
  const [studentId, setStudentId] = useState("demo-student");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languageMode, setLanguageMode] = useState<"english" | "urdu">("english");
  const [autoRead, setAutoRead] = useState(false);
  const [audioRate, setAudioRate] = useState(1.0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [studySessionId, setStudySessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>("explain");
  const [staticContent, setStaticContent] = useState<StaticTopicContent | null>(null);
  const [showTestAnswer, setShowTestAnswer] = useState(false);
  const [showUrdu, setShowUrdu] = useState(false);
  const [testScore, setTestScore] = useState({ correct: 0, total: 0 });
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [trialMessageLimitReached, setTrialMessageLimitReached] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const startedAtRef = useRef(new Date().toISOString());
  const hasSavedSessionRef = useRef(false);

  useEffect(() => {
    const hydrateUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setStudentId(user.id);
    };
    void hydrateUser();
  }, []);

  useEffect(() => {
    speechSynthRef.current = window.speechSynthesis;
    return () => {
      speechSynthRef.current?.cancel();
    };
  }, []);

  const stopSpeaking = () => {
    speechSynthRef.current?.cancel();
    utteranceRef.current = null;
    setSpeakingMessageId(null);
  };

  const speakText = (text: string, messageId: string) => {
    if (!speechSynthRef.current) return;
    if (speakingMessageId === messageId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = audioRate;
    if (languageMode === "urdu") {
      utterance.lang = "ur-PK";
    } else {
      utterance.lang = "en-US";
    }
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    speechSynthRef.current.speak(utterance);
  };

  useEffect(() => {
    localStorage.setItem("lastLearnTopic", JSON.stringify({ subject, topic }));
  }, [subject, topic]);

  useEffect(() => {
    const loadUsage = async () => {
      const usage = await getTrialUsage(studentId);
      setMessagesUsed(usage.messagesUsed);
      setTrialMessageLimitReached(usage.messagesUsed >= TRIAL_LIMITS.tutorMessages);
    };
    void loadUsage();
  }, [studentId, messages.length]);

  useEffect(() => {
    if (!subject || !topic) return;
    setIsLoadingContent(true);
    fetch(`/api/topic-content?subject=${encodeURIComponent(subject)}&subtopic=${encodeURIComponent(topic)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setStaticContent(data);
        setShowUrdu(false);
      })
      .catch(() => {
        // ignore, page can still use chat fallback
      })
      .finally(() => setIsLoadingContent(false));
  }, [subject, topic]);

  useEffect(() => {
    const initStudySession = async () => {
      try {
        const status = await startStudySession({ studentId, source: "tutor", topic });
        setStudySessionId(status.sessionId);
      } catch {
        setStudySessionId(null);
      }
    };
    void initStudySession();
  }, [studentId, topic]);

  useEffect(() => {
    if (!studySessionId) return;
    const timer = window.setInterval(() => {
      void updateSession({ sessionId: studySessionId, studentId, incrementMinutes: 1 });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [studySessionId, studentId]);

  useEffect(() => {
    const saveSession = () => {
      if (hasSavedSessionRef.current) return;
      hasSavedSessionRef.current = true;

      const payload = JSON.stringify({
        studentId,
        subject,
        topic,
        messageCount: messages.length,
        startedAt: startedAtRef.current,
      });
      navigator.sendBeacon("/api/tutor-session", payload);
    };

    window.addEventListener("beforeunload", saveSession);
    return () => {
      saveSession();
      window.removeEventListener("beforeunload", saveSession);
    };
  }, [messages.length, studentId, subject, topic]);

  const promptPractice = useMemo(() => messages.length >= 5, [messages.length]);

  const runLessonAction = async (action: LessonStep) => {
    if (action === "past-paper") {
      router.push(`/practice?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}`);
      return;
    }

    setCurrentStep(action);
    if (action === "test") setShowTestAnswer(false);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trialMessageLimitReached) return;

    const nextMessages: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      const messageWithContext = staticContent
        ? `[Topic context: ${staticContent.definition}. Key points: ${staticContent.key_points.join(". ")}]\n\nStudent question: ${trimmed}`
        : trimmed;
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          message: messageWithContext,
          history: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: "chat",
          languageMode,
          studentId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Tutor request failed.");
      }
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.message as string },
      ]);
      setMessagesUsed((prev) => {
        const next = prev + 1;
        if (next >= TRIAL_LIMITS.tutorMessages) {
          setTrialMessageLimitReached(true);
        }
        return next;
      });

    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Tutor request failed.";
      setError(message);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (!autoRead || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant") {
      speakText(last.content, last.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, autoRead, audioRate, languageMode]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-3 pb-24 pt-4 sm:px-5">
      <header className="rounded-2xl bg-white p-4 shadow-card">
        <p className="text-xs text-slate-500">{subject}</p>
        <h1 className="heading-font text-2xl font-bold text-slate-900">{topic}</h1>
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lesson progress</p>
          <div className="grid grid-cols-5 gap-1 text-[10px] sm:text-xs">
            {lessonSteps.map((step, index) => {
              const activeIndex = lessonSteps.findIndex((item) => item.key === currentStep);
              const isActive = step.key === currentStep;
              const isDone = index < activeIndex;
              return (
                <div
                  key={step.key}
                  className={`rounded-md px-2 py-1 text-center font-semibold ${
                    isActive
                      ? "bg-brand-teal text-white"
                      : isDone
                        ? "bg-teal-100 text-brand-teal"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setLanguageMode("english")}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                languageMode === "english" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguageMode("urdu")}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                languageMode === "urdu" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              اردو
            </button>
          </div>
          <button
            onClick={() => setAutoRead((prev) => !prev)}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${
              autoRead ? "bg-teal-100 text-brand-teal" : "bg-slate-100 text-slate-700"
            }`}
          >
            Auto-read responses 🔊
          </button>
        </div>
      </header>

      <section className="relative z-20 mt-3 rounded-2xl bg-white p-3 shadow-card">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button onClick={() => void runLessonAction("explain")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">📖 Explain this topic</button>
          <button onClick={() => void runLessonAction("formulas")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">📝 Key formulas</button>
          <button onClick={() => void runLessonAction("example")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">🔍 Worked example</button>
          <button onClick={() => void runLessonAction("test")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">❓ Test me</button>
          <button onClick={() => void runLessonAction("past-paper")} className="rounded-lg bg-brand-teal px-3 py-2 text-xs font-semibold text-white">📄 Past paper question</button>
        </div>
      </section>

      <section className="relative z-0 mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-card">
        {isLoadingContent && <p className="text-sm text-slate-600">Loading topic content...</p>}
        {currentStep !== "past-paper" && (
          <div className="rounded-2xl bg-teal-50 p-4">
            {staticContent?.audio_url_en && (
              <button
                onClick={() => new Audio(staticContent.audio_url_en!).play()}
                style={{
                  background: "#189080", color: "white", border: "none",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                }}
              >
                🔊 Listen in English
              </button>
            )}

            {staticContent?.urdu_summary && (
              <div className="mt-2">
                <button
                  onClick={() => setShowUrdu(!showUrdu)}
                  style={{
                    background: "#f5731e", color: "white", border: "none",
                    borderRadius: 8, padding: "8px 16px", fontSize: 13,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  اردو میں پڑھیں
                </button>
                {showUrdu && (
                  <div style={{
                    background: "#FFF8F0", border: "1px solid rgba(245,115,30,0.3)",
                    borderRadius: 12, padding: "16px", marginTop: 10,
                    fontFamily: "serif", fontSize: 16, lineHeight: 1.8,
                    direction: "rtl", textAlign: "right"
                  }}>
                    <p>{staticContent.urdu_summary}</p>
                    {staticContent.audio_url_ur && (
                      <button
                        onClick={() => new Audio(staticContent.audio_url_ur!).play()}
                        style={{
                          background: "#f5731e", color: "white", border: "none",
                          borderRadius: 8, padding: "6px 14px", fontSize: 13,
                          cursor: "pointer", marginTop: 8, direction: "ltr"
                        }}
                      >
                        🔊 سنیں
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === "explain" && (
              <LearnContent
                topic={topic}
                text={`DEFINITION: ${staticContent?.definition ?? ""}
KEY POINTS:
${(staticContent?.key_points ?? []).map((point) => `- ${point}`).join("\n")}
EXAM TIP: ${staticContent?.exam_tip ?? ""}`}
              />
            )}
            {currentStep === "formulas" && (
              <LearnContent
                topic={topic}
                text={(staticContent?.formulas ?? [])
                  .map((formula) => `FORMULA: ${formula.formula}\nVARIABLES: ${formula.variables ?? ""}`)
                  .join("\n")}
              />
            )}
            {currentStep === "example" && (
              <LearnContent
                topic={topic}
                text={`WORKED EXAMPLE:
QUESTION: ${staticContent?.worked_example?.question ?? ""}
${(staticContent?.worked_example?.steps ?? []).map((step, i) => `STEP ${i + 1}: ${step}`).join("\n")}
ANSWER: ${staticContent?.worked_example?.answer ?? ""}
TAKEAWAY: ${staticContent?.worked_example?.takeaway ?? ""}`}
              />
            )}
            {currentStep === "test" && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">
                  {testScore.correct} out of {testScore.total} correct
                </p>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-900">{staticContent?.quick_check || "No quick check available."}</p>
                  {showTestAnswer ? (
                    <p className="mt-3 text-sm font-semibold text-teal-800">
                      Ask in chat and compare with your own answer.
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {!showTestAnswer ? (
                    <button
                      onClick={() => setShowTestAnswer(true)}
                      className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
                    >
                      Show Answer
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setTestScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }));
                          void runLessonAction("test");
                        }}
                        className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
                      >
                        I got it
                      </button>
                      <button
                        onClick={() => {
                          setTestScore((prev) => ({ correct: prev.correct, total: prev.total + 1 }));
                          void runLessonAction("test");
                        }}
                        className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Try again
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {isTyping && (
          <div className="max-w-[85%] rounded-2xl bg-teal-100 px-4 py-3 text-sm text-slate-700">
            <span className="animate-pulse">MyGradePal is typing...</span>
          </div>
        )}

        {promptPractice && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-slate-800">
            Ready to test yourself? Try a practice question on this topic -{" "}
            <Link
              href={`/practice?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}`}
              className="font-semibold text-brand-teal underline"
            >
              go to practice
            </Link>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {trialMessageLimitReached && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-slate-800">
            You have used all 20 free trial messages. Upgrade to continue learning with your personal tutor.{" "}
            <Link href="/pricing" className="font-semibold text-brand-teal underline">
              Upgrade now
            </Link>
            .
          </div>
        )}
      </section>

      <section className="mt-2 rounded-2xl bg-white p-3 shadow-card">
        <p className="text-xs text-slate-600">Audio speed: Slow - Normal - Fast</p>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={audioRate === 0.7 ? 0 : audioRate === 1.4 ? 2 : 1}
          onChange={(event) => {
            const value = Number(event.target.value);
            const rate = value === 0 ? 0.7 : value === 2 ? 1.4 : 1.0;
            setAudioRate(rate);
            if (speakingMessageId) {
              stopSpeaking();
            }
          }}
          className="mt-2 w-full accent-brand-teal"
        />
      </section>

      <section className="mt-3 rounded-2xl bg-white p-3 shadow-card">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full bg-slate-100 p-2 text-slate-700"
            title="Voice input (Urdu/English) - coming soon"
          >
            <Mic className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask anything about this topic..."
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand-teal focus:ring-2"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={trialMessageLimitReached}
            className="rounded-full bg-brand-orange p-2 text-white disabled:opacity-60"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>

      <button
        onClick={() => router.push(`/learn/${encodeURIComponent(subject)}`)}
        className="mt-3 w-full rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
      >
        Back to topics
      </button>

      <BottomNav />
    </main>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TutorPageContent />
    </Suspense>
  );
}
