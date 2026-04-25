"use client";

import Link from "next/link";
import { Mic, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "@/components/BottomNav";
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

function TutorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject") ?? "Chemistry";
  const topic = searchParams.get("topic") ?? "General";
  const [studentId, setStudentId] = useState("demo-student");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingStart, setIsLoadingStart] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [languageMode, setLanguageMode] = useState<"english" | "urdu">("english");
  const [autoRead, setAutoRead] = useState(false);
  const [audioRate, setAudioRate] = useState(1.0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [studySessionId, setStudySessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>("explain");
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [testPassed, setTestPassed] = useState(false);
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
    const startSession = async () => {
      setIsLoadingStart(true);
      setError(null);
      try {
        const response = await fetch("/api/tutor-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, topic, studentId, languageMode }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "Could not start tutor session.");
        }

        setMessages([{ id: crypto.randomUUID(), role: "assistant", content: data.message as string }]);
      } catch (startError) {
        const message =
          startError instanceof Error ? startError.message : "Could not start tutor session.";
        setError(message);
      } finally {
        setIsLoadingStart(false);
      }
    };

    void startSession();
  }, [subject, topic, languageMode]);

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
    setError(null);
    setIsTyping(true);
    const prompts: Record<Exclude<LessonStep, "past-paper">, string> = {
      explain: `Explain ${topic} in a clear textbook style for a grade 10 student. Use 4 short sections and simple language.`,
      formulas: `List all key formulas for ${topic} in ${subject}. For each: formula, what each symbol means, when to use it.`,
      example: `Give one worked example for ${topic} from a past-paper style question. Show numbered steps and final answer.`,
      test: `Give one quick quiz question on ${topic}. Include "Answer:" on the last line with only the correct short answer.`,
    };

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          message: prompts[action],
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          languageMode,
          studentId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Could not load lesson step.");

      let content = String(data.message ?? "").trim();
      if (action === "test") {
        const answerMatch = content.match(/Answer:\s*(.+)$/im);
        setTestAnswer(answerMatch?.[1]?.trim().toLowerCase() ?? null);
        setTestPassed(false);
        content = content.replace(/\n*Answer:\s*(.+)$/im, "").trim();
      }
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content }]);
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Could not load lesson step.";
      setError(message);
    } finally {
      setIsTyping(false);
    }
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
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          message: trimmed,
          history: nextMessages.map((m) => ({ role: m.role, content: m.content })),
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

      if (currentStep === "test" && testAnswer) {
        const normalized = trimmed.toLowerCase();
        if (normalized.includes(testAnswer) || testAnswer.includes(normalized)) {
          setTestPassed(true);
        }
      }
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

      <section className="mt-3 rounded-2xl bg-white p-3 shadow-card">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button onClick={() => void runLessonAction("explain")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">📖 Explain this topic</button>
          <button onClick={() => void runLessonAction("formulas")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">📝 Key formulas</button>
          <button onClick={() => void runLessonAction("example")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">🔍 Worked example</button>
          <button onClick={() => void runLessonAction("test")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800">❓ Test me</button>
          <button onClick={() => void runLessonAction("past-paper")} className="rounded-lg bg-brand-teal px-3 py-2 text-xs font-semibold text-white">📄 Past paper question</button>
        </div>
      </section>

      <section className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-card">
        {isLoadingStart && <p className="text-sm text-slate-600">Starting tutor...</p>}
        {messages.map((message) => (
          <div key={message.id} className={message.role === "assistant" ? "" : "ml-auto"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.role === "assistant"
                  ? "bg-teal-100 text-slate-900"
                  : "ml-auto bg-orange-100 text-slate-900"
              }`}
            >
              {message.content}
            </div>
            {message.role === "assistant" && (
              <button
                onClick={() => speakText(message.content, message.id)}
                className={`mt-1 flex items-center gap-1 text-xs ${
                  speakingMessageId === message.id
                    ? "animate-pulse text-brand-orange"
                    : "text-[#189080]"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2c0-1.8-1-3.3-2.5-4.1v8.2c1.5-.8 2.5-2.3 2.5-4.1zm2.5 0c0 3-1.7 5.6-4.2 6.9l1 1.7c3.1-1.7 5.2-5 5.2-8.6s-2.1-6.9-5.2-8.6l-1 1.7c2.5 1.3 4.2 3.9 4.2 6.9z" />
                </svg>
                {speakingMessageId === message.id ? "Stop" : "Listen"}
              </button>
            )}
          </div>
        ))}
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
        {testPassed ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-semibold">
              Great! You understand the concept. Ready for a real past paper question? →
            </p>
            <Link
              href={`/practice?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}`}
              className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Go to past paper practice
            </Link>
          </div>
        ) : null}
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
