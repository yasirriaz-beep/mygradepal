"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "@/components/BottomNav";
import LearnContent from "@/components/LearnContent";
import { CHEMISTRY_VIDEOS } from "@/lib/chemistry-videos";
import { completeStudySession, type NextPlanSession } from "@/lib/completeStudySession";
import { supabase } from "@/lib/supabase";
import { startSession as startStudySession, updateSession } from "@/lib/studySessionClient";
import { getTrialUsage, TRIAL_LIMITS } from "@/lib/trialLimits";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  audioUrl?: string | null;
};

type LessonStep = "watch" | "explain" | "formulas" | "example" | "test" | "past-paper";

const lessonSteps: Array<{ key: LessonStep; label: string }> = [
  { key: "watch", label: "Watch" },
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
};

function TutorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject") ?? "Chemistry";
  const topic = searchParams.get("topic") ?? "General";
  const [studentId, setStudentId] = useState("demo-student");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing" | "paused">("idle");
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [studySessionId, setStudySessionId] = useState<string | null>(null);
  const [targetGrade, setTargetGrade] = useState<"C" | "B" | "A" | "A*" | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>("explain");
  const [staticContent, setStaticContent] = useState<StaticTopicContent | null>(null);
  const [testAnswer, setTestAnswer] = useState("");
  const [testResult, setTestResult] = useState<{
    correct: boolean;
    feedback: string;
    correct_answer: string;
  } | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [showUrdu, setShowUrdu] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [testScore, setTestScore] = useState({ correct: 0, total: 0 });
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [trialMessageLimitReached, setTrialMessageLimitReached] = useState(false);
  const [lessonCompleteOverlay, setLessonCompleteOverlay] = useState(false);
  const [lessonCompleting, setLessonCompleting] = useState(false);
  const [finishNextSession, setFinishNextSession] = useState<NextPlanSession | null>(null);
  const [finishQuestionsCount, setFinishQuestionsCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);
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

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setAudioState("idle");
  };

  const speakText = (text: string, messageId: string) => {
    if (!speechSynthRef.current) return;
    if (speakingMessageId === messageId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.lang = "en-US";
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    speechSynthRef.current.speak(utterance);
  };

  const initAudio = () => {
    if (!staticContent?.audio_url_en) return;
    if (audioRef.current) {
      return;
    }
    const audio = new Audio(staticContent.audio_url_en);
    audio.playbackRate = audioSpeed;
    audio.onended = () => setAudioState("idle");
    audioRef.current = audio;
  };

  const handlePlay = () => {
    initAudio();
    void audioRef.current?.play();
    setAudioState("playing");
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setAudioState("paused");
  };

  const playChatAudio = (audioUrl: string, index: number) => {
    if (chatAudioRef.current) {
      chatAudioRef.current.pause();
      chatAudioRef.current.currentTime = 0;
      chatAudioRef.current = null;
    }

    if (playingMsgIndex === index) {
      setPlayingMsgIndex(null);
      return;
    }

    const audio = new Audio(audioUrl);
    chatAudioRef.current = audio;
    setPlayingMsgIndex(index);
    void audio.play();
    audio.onended = () => {
      setPlayingMsgIndex(null);
      chatAudioRef.current = null;
    };
  };

  const stopChatAudio = () => {
    if (chatAudioRef.current) {
      chatAudioRef.current.pause();
      chatAudioRef.current.currentTime = 0;
      chatAudioRef.current = null;
    }
    setPlayingMsgIndex(null);
  };

  const startVoiceInput = () => {
    const w = window as any;
    const SpeechRecognitionAPI = w.webkitSpeechRecognition || w.SpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Voice input only works in Chrome. Please use Chrome or type your question.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  useEffect(() => {
    handleStop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  useEffect(() => {
    if (currentStep !== "explain") {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = audioSpeed;
    }
  }, [audioSpeed]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (chatAudioRef.current) {
        chatAudioRef.current.pause();
        chatAudioRef.current = null;
      }
      setAudioState("idle");
    };
  }, []);

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
    if (!studentId || studentId === "demo-student" || !topic) return;
    const today = new Date().toISOString().split("T")[0];
    void supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .gte("attempted_at", today + "T00:00:00")
      .then(({ count }) => setFinishQuestionsCount(count ?? 0));
  }, [studentId, topic]);

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
    if (!studentId || studentId === "demo-student") return;
    const loadTargetGrade = async () => {
      const { data } = await supabase
        .from("students")
        .select("target_grade")
        .eq("id", studentId)
        .single();
      if (data?.target_grade) {
        setTargetGrade(data.target_grade as "C" | "B" | "A" | "A*");
      }
    };
    void loadTargetGrade();
  }, [studentId]);

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

  const currentTopic = topic;
  const topicData = subject === "Chemistry"
    ? CHEMISTRY_VIDEOS.find(t =>
        CHEMISTRY_VIDEOS.some(cv => cv.topic === t.topic) &&
        t.topic.toLowerCase().split(" ").some(word =>
          currentTopic?.toLowerCase().includes(word) && word.length > 3
        )
      )
    : null;

  const topicVideos = topicData?.videos ?? [];
  const hasVideo = topicVideos.length > 0;
  const currentVideo = topicVideos[activeVideoIndex];

  const subtopicTimestamp = currentVideo?.subtopic_timestamps?.find(st =>
    currentTopic?.toLowerCase().includes(st.subtopic.toLowerCase()) ||
    st.subtopic.toLowerCase().includes(
      (currentTopic ?? "").toLowerCase().split("—")[0].trim().toLowerCase()
    )
  );
  const visibleLessonSteps = hasVideo
    ? lessonSteps
    : lessonSteps.filter((s) => s.key !== "watch");

  const activeStepIndex = visibleLessonSteps.findIndex((s) => s.key === currentStep);

  const goToNextStep = () => {
    const i = visibleLessonSteps.findIndex((s) => s.key === currentStep);
    if (i >= 0 && i < visibleLessonSteps.length - 1) {
      setCurrentStep(visibleLessonSteps[i + 1].key);
    }
  };

  useEffect(() => {
    if (!hasVideo && currentStep === "watch") {
      setCurrentStep("explain");
    }
  }, [hasVideo, currentStep]);

  useEffect(() => {
    setActiveVideoIndex(0);
  }, [topic]);

  const fmtLessonCompleteDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const handleFinishLessonSession = async () => {
    if (!studentId || studentId === "demo-student" || lessonCompleting) return;
    setLessonCompleting(true);
    try {
      const { nextSession } = await completeStudySession({
        studentId,
        topic,
        questionsAttempted: finishQuestionsCount,
      });
      setFinishNextSession(nextSession);
      setLessonCompleteOverlay(true);
    } finally {
      setLessonCompleting(false);
    }
  };

  useEffect(() => {
    setShowUrdu(false);
  }, [currentStep]);

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
        ? `You are teaching the topic: "${topic}" in ${subject}. 
Here is the topic content for reference:
Definition: ${staticContent.definition}
Key points: ${staticContent.key_points?.join(". ")}

Student question: ${trimmed}`
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
          studentId,
          targetGrade: targetGrade ?? undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Tutor request failed.");
      }
      const claudeResponse = String(data.message ?? "");
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: claudeResponse }),
      });
      const ttsData = ttsRes.ok ? await ttsRes.json() : null;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: claudeResponse,
          audioUrl: ttsData?.audioUrl ?? null,
        },
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

  const submitTestAnswer = async () => {
    if (!testAnswer.trim() || !staticContent?.quick_check) return;
    setIsMarking(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          mode: "chat",
          history: [],
          studentId,
          targetGrade: targetGrade ?? undefined,
          message: `You are marking a student's answer for an O Level Chemistry question.

Question: ${staticContent.quick_check}
Student's answer: ${testAnswer}

Respond ONLY with a JSON object like this:
{
  "correct": true or false,
  "correct_answer": "The full correct answer in 1-2 sentences",
  "feedback": "Brief encouraging feedback - what they got right, what to improve"
}

No markdown, no extra text, just raw JSON.`,
        }),
      });

      const data = await res.json();
      const rawMessage = String(data?.message ?? "");
      try {
        const clean = rawMessage.replace(/```json|```/g, "").trim();
        const result = JSON.parse(clean) as {
          correct: boolean;
          correct_answer: string;
          feedback: string;
        };
        setTestResult(result);
        setTestScore((prev) => ({
          correct: prev.correct + (result.correct ? 1 : 0),
          total: prev.total + 1,
        }));
      } catch {
        setTestResult({
          correct: false,
          correct_answer: "",
          feedback: rawMessage || "Could not parse the marking response. Please try again.",
        });
        setTestScore((prev) => ({
          correct: prev.correct,
          total: prev.total + 1,
        }));
      }
    } catch {
      setTestResult({
        correct: false,
        correct_answer: "",
        feedback: "Could not mark right now. Please try again.",
      });
    } finally {
      setIsMarking(false);
    }
  };

  const resetTest = () => {
    setTestAnswer("");
    setTestResult(null);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-3 pb-24 pt-4 sm:px-5">
      <header className="relative rounded-2xl bg-white p-4 pr-36 shadow-card sm:pr-44">
        <Link
          href={`/practice?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`}
          className="absolute right-3 top-3 max-w-[11rem] text-right text-[11px] leading-snug text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 sm:right-4 sm:top-4 sm:max-w-none sm:text-xs"
        >
          Already know this? Skip to practice →
        </Link>
        <p className="text-xs text-slate-500">{subject}</p>
        <h1 className="heading-font pr-2 text-2xl font-bold text-slate-900">{topic}</h1>
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lesson progress</p>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[10px] sm:text-xs">
            {visibleLessonSteps.map((step, index) => {
              const isActive = step.key === currentStep;
              const isDone = index < activeStepIndex;
              return (
                <span key={step.key} className="inline-flex items-center gap-1">
                  {index > 0 && (
                    <span className="px-0.5 text-slate-300" aria-hidden>
                      →
                    </span>
                  )}
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                      <span className="text-emerald-600">✓</span>
                      {step.label}
                    </span>
                  ) : isActive ? (
                    <span className="rounded-md border-2 border-brand-teal bg-brand-teal px-2.5 py-1 font-semibold text-white shadow-sm">
                      {step.label}
                    </span>
                  ) : (
                    <span
                      className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-semibold text-slate-400 select-none"
                      aria-disabled
                    >
                      · {step.label}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <section className="relative z-0 mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-card">
        {isLoadingContent && <p className="text-sm text-slate-600">Loading topic content...</p>}
        <div className="rounded-2xl bg-teal-50 p-4">
            {currentStep === "watch" && hasVideo && (
              <div style={{ padding: "0 0 20px" }}>
                {topicVideos.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {topicVideos.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveVideoIndex(i)}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 600,
                          background: activeVideoIndex === i ? "#189080" : "white",
                          color: activeVideoIndex === i ? "white" : "#189080",
                          border: "1.5px solid #189080",
                          cursor: "pointer"
                        }}
                      >
                        Part {v.part}
                      </button>
                    ))}
                  </div>
                )}

                {subtopicTimestamp && (
                  <div style={{
                    background: "#fff7ed",
                    border: "1.5px solid #fed7aa",
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10
                  }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#f5731e", margin: "0 0 2px", textTransform: "uppercase" }}>
                        📍 This subtopic in the video
                      </p>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                        <strong>{currentTopic?.split("—")[0].trim()}</strong> starts at <strong>{subtopicTimestamp.time}</strong>
                      </p>
                    </div>
                    <a
                      href={`https://www.youtube.com/watch?v=${currentVideo.youtube_id}&t=${subtopicTimestamp.seconds}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: "#f5731e",
                        color: "white",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none",
                        whiteSpace: "nowrap"
                      }}
                    >
                      ▶ Jump to {subtopicTimestamp.time}
                    </a>
                  </div>
                )}

                <div style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  marginBottom: 16
                }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${topicVideos[activeVideoIndex]?.youtube_id}`}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen
                    title={topicVideos[activeVideoIndex]?.title}
                  />
                </div>

                <div style={{
                  background: "#e8f8f4",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 14,
                  border: "1px solid #a7f3d0"
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#189080", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    📹 What this video covers
                  </p>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                    {topicVideos[activeVideoIndex]?.summary}
                  </p>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Jump to section
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {topicVideos[activeVideoIndex]?.timestamps.map((ts) => (
                    <a
                      key={ts.time}
                      href={`https://www.youtube.com/watch?v=${topicVideos[activeVideoIndex].youtube_id}&t=${ts.time}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        color: "#189080",
                        background: "white",
                        border: "1px solid #a7f3d0",
                        borderRadius: 20,
                        padding: "4px 12px",
                        textDecoration: "none",
                        fontWeight: 500
                      }}
                    >
                      ▶ {ts.time} — {ts.label}
                    </a>
                  ))}
                </div>

                <p style={{ fontSize: 11, color: "#9ca3af", margin: "16px 0 0" }}>
                  Video by IGCSE Study Buddy · Content mapped to Cambridge 0620 syllabus
                </p>
              </div>
            )}
            {currentStep === "explain" && staticContent?.audio_url_en && (
              <>
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#f9fafb", borderRadius: 12, padding: "10px 16px",
                    border: "1px solid #e5e7eb", marginBottom: 4
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={handlePlay}
                      disabled={audioState === "playing"}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", border: "none",
                        background: audioState === "playing" ? "#ccc" : "#189080",
                        color: "white", fontSize: 14, cursor: audioState === "playing" ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      ▶
                    </button>
                    <button
                      onClick={handlePause}
                      disabled={audioState !== "playing"}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", border: "none",
                        background: audioState === "playing" ? "#f5731e" : "#ccc",
                        color: "white", fontSize: 14, cursor: audioState === "playing" ? "pointer" : "default",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      ⏸
                    </button>
                    <button
                      onClick={handleStop}
                      disabled={audioState === "idle"}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", border: "none",
                        background: audioState === "idle" ? "#ccc" : "#374151",
                        color: "white", fontSize: 14, cursor: audioState === "idle" ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      ⏹
                    </button>
                    <span style={{ fontSize: 12, color: "#189080", marginLeft: 4 }}>
                      {audioState === "playing" ? "🔊 Playing..." : audioState === "paused" ? "⏸ Paused" : "🎧 Listen"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#888" }}>Speed:</span>
                    {[0.75, 1, 1.25, 1.5].map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          setAudioSpeed(speed);
                          if (audioRef.current) audioRef.current.playbackRate = speed;
                        }}
                        style={{
                          padding: "3px 8px", borderRadius: 20, fontSize: 11,
                          border: "1px solid #189080",
                          background: audioSpeed === speed ? "#189080" : "white",
                          color: audioSpeed === speed ? "white" : "#189080",
                          cursor: "pointer"
                        }}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 11, color: "#888", textAlign: "center", marginTop: 4, marginBottom: 12
                  }}
                >
                  Use the play controls above to listen to this topic in English
                </p>
              </>
            )}

            {currentStep === "explain" && staticContent?.urdu_summary && (
              <div className="mt-2">
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    onClick={() => setShowUrdu(!showUrdu)}
                    style={{
                      background: "#f5731e",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "serif",
                    }}
                  >
                    اردو
                  </button>
                </div>
                {showUrdu && (
                  <div style={{
                    background: "#FFF8F0", border: "1px solid rgba(245,115,30,0.3)",
                    borderRadius: 12, padding: "16px", marginTop: 10,
                    fontFamily: "serif", fontSize: 16, lineHeight: 1.8,
                    direction: "rtl", textAlign: "right"
                  }}>
                    <p>{staticContent.urdu_summary}</p>
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
              <>
                {staticContent?.formulas && staticContent.formulas.length > 0 ? (
                  <LearnContent
                    topic={topic}
                    text={staticContent.formulas
                      .map((formula) => `FORMULA: ${formula.formula}\nVARIABLES: ${formula.variables ?? ""}`)
                      .join("\n")}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center", padding: "40px 20px",
                      background: "white", borderRadius: 12,
                      border: "1px solid #e5e7eb"
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧮</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      No formulas for this topic
                    </p>
                    <p style={{ fontSize: 13, color: "#888", maxWidth: 280, margin: "0 auto" }}>
                      This topic is concept-based. Use the Explain tab to understand it,
                      then test yourself with Test me.
                    </p>
                  </div>
                )}
              </>
            )}
            {currentStep === "example" && (
              <>
                {staticContent?.worked_example ? (
                  <LearnContent
                    topic={topic}
                    text={`WORKED EXAMPLE:
QUESTION: ${staticContent.worked_example.question ?? ""}
${(staticContent.worked_example.steps ?? []).map((step, i) => `STEP ${i + 1}: ${step}`).join("\n")}
ANSWER: ${staticContent.worked_example.answer ?? ""}
TAKEAWAY: ${staticContent.worked_example.takeaway ?? ""}`}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center", padding: "40px 20px",
                      background: "white", borderRadius: 12,
                      border: "1px solid #e5e7eb"
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      No worked example for this topic
                    </p>
                    <p style={{ fontSize: 13, color: "#888", maxWidth: 280, margin: "0 auto" }}>
                      This topic is best understood through explanation.
                      Try asking your tutor a specific question below.
                    </p>
                  </div>
                )}
              </>
            )}
            {currentStep === "test" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#189080" }}>
                  {testScore.correct} out of {testScore.total} correct
                </div>

                <div
                  style={{
                    background: "white",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#189080",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}
                  >
                    ? Test Yourself
                  </p>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#1a1a1a",
                      lineHeight: 1.6,
                      marginBottom: 16,
                    }}
                  >
                    {staticContent?.quick_check || "No quick check available for this topic yet."}
                  </p>

                  {!testResult && (
                    <>
                      <textarea
                        value={testAnswer}
                        onChange={(e) => setTestAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={3}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          padding: "10px 14px",
                          border: "1.5px solid #e5e7eb",
                          fontSize: 14,
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#189080";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#e5e7eb";
                        }}
                      />
                      <button
                        onClick={() => void submitTestAnswer()}
                        disabled={!testAnswer.trim() || isMarking || !staticContent?.quick_check}
                        style={{
                          marginTop: 10,
                          background: testAnswer.trim() ? "#189080" : "#ccc",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 24px",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: testAnswer.trim() ? "pointer" : "default",
                        }}
                      >
                        {isMarking ? "Marking..." : "Submit Answer"}
                      </button>
                    </>
                  )}
                </div>

                {testResult && (
                  <div
                    style={{
                      background: testResult.correct ? "#E8F8F4" : "#FEF2F2",
                      border: `1.5px solid ${testResult.correct ? "#189080" : "#FCA5A5"}`,
                      borderRadius: 12,
                      padding: "20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 28 }}>{testResult.correct ? "✅" : "❌"}</span>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: testResult.correct ? "#0a5c4a" : "#b91c1c",
                          margin: 0,
                        }}
                      >
                        {testResult.correct ? "Correct! Well done!" : "Not quite right"}
                      </p>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#888",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 4,
                        }}
                      >
                        Your answer
                      </p>
                      <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>{testAnswer}</p>
                    </div>

                    <div
                      style={{
                        background: "white",
                        borderRadius: 8,
                        padding: "12px 14px",
                        marginBottom: 12,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#189080",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 4,
                        }}
                      >
                        Correct answer
                      </p>
                      <p style={{ fontSize: 14, color: "#0a5c4a", margin: 0, fontWeight: 500 }}>
                        {testResult.correct_answer || "No model answer provided."}
                      </p>
                    </div>

                    <p style={{ fontSize: 13, color: "#374151", fontStyle: "italic", marginBottom: 16 }}>
                      💬 {testResult.feedback}
                    </p>

                    <button
                      onClick={resetTest}
                      style={{
                        background: "#189080",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 20px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}
            {currentStep === "past-paper" && (
              <div
                style={{
                  textAlign: "center",
                  padding: "28px 16px",
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#189080", marginBottom: 8 }}>
                  📄 Past paper style questions
                </p>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 18, lineHeight: 1.6 }}>
                  Try real exam-style questions for <strong>{topic}</strong>. You can keep using the tutor chat below anytime.
                </p>
                <Link
                  href={`/practice?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`}
                  style={{
                    display: "inline-block",
                    background: "#189080",
                    color: "white",
                    borderRadius: 10,
                    padding: "11px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Open practice for this topic →
                </Link>
              </div>
            )}

            {currentStep === "past-paper" ? (
              <button
                type="button"
                onClick={() => void handleFinishLessonSession()}
                disabled={lessonCompleting}
                className="mt-6 w-full rounded-xl border-2 border-emerald-700 bg-emerald-600 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500"
              >
                {lessonCompleting ? "Saving..." : "✓ Finish Session"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextStep}
                className="mt-6 w-full rounded-xl bg-brand-teal py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95"
              >
                Next Step →
              </button>
            )}
        </div>
        <div
          style={{
            background: "#EEF6FF",
            borderRadius: 16,
            padding: "16px",
            marginTop: 24,
            border: "1px solid #BFDBFE"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span
              style={{
                fontSize: 13, fontWeight: 700, color: "#1D4ED8",
                textTransform: "uppercase", letterSpacing: "0.08em"
              }}
            >
              🤖 Ask Your Tutor
            </span>
          </div>

          <div
            style={{
              background: "#f9fafb", borderRadius: 12, padding: 16,
              minHeight: 80, maxHeight: 320, overflowY: "auto",
              marginBottom: 12, display: "flex", flexDirection: "column", gap: 10
            }}
          >
            {messages.length === 0 && !isTyping && (
              <p style={{ fontSize: 13, color: "#888", textAlign: "center", margin: "auto" }}>
                Have a question about this topic? Ask below 👇
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                {msg.role === "assistant" && <span style={{ fontSize: 18, marginBottom: 4 }}>🤖</span>}
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    background: msg.role === "user" ? "#189080" : "white",
                    color: msg.role === "user" ? "white" : "#1a1a1a",
                    borderRadius:
                      msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.audioUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => playChatAudio(msg.audioUrl!, i)}
                        style={{
                          width: 28, height: 28, borderRadius: "50%", border: "none",
                          background: playingMsgIndex === i ? "#f5731e" : "#189080",
                          color: "white", fontSize: 12, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                      >
                        {playingMsgIndex === i ? "⏸" : "▶"}
                      </button>
                      {playingMsgIndex === i && (
                        <button
                          onClick={stopChatAudio}
                          style={{
                            width: 28, height: 28, borderRadius: "50%", border: "none",
                            background: "#374151", color: "white", fontSize: 12,
                            cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          ⏹
                        </button>
                      )}
                      <span style={{ fontSize: 11, color: "#888" }}>
                        {playingMsgIndex === i ? "Playing..." : "Listen"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    background: "white",
                    color: "#1a1a1a",
                    borderRadius: "18px 18px 18px 4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  <span className="animate-pulse">MyGradePal is typing...</span>
                </div>
              </div>
            )}
          </div>
        </div>

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

      <section className="mt-3 rounded-2xl bg-white p-3 shadow-card">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startVoiceInput}
            title={isListening ? "Listening..." : "Speak your question"}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: isListening ? "#f5731e" : "#e5e7eb",
              color: isListening ? "white" : "#666",
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              animation: isListening ? "pulse 1s infinite" : "none"
            }}
          >
            🎤
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
            placeholder="Type or speak your question..."
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

      <BottomNav />

      {lessonCompleteOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#f0faf8",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans', sans-serif",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#e8f8f4",
                border: "3px solid #189080",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                margin: "0 auto 20px",
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 24,
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              Session Complete! 🎉
            </h1>
            <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 24px" }}>
              Great work on <strong>{topic}</strong>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Topic Covered", value: subject, color: "#189080" },
                {
                  label: "Questions Done",
                  value: String(finishQuestionsCount || "—"),
                  color: "#f5731e",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    padding: "14px 10px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{s.label}</p>
                </div>
              ))}
            </div>
            {finishNextSession && (
              <div
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 20,
                  border: "1.5px solid #189080",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#189080",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: "0 0 6px",
                  }}
                >
                  Next Session
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>
                  {finishNextSession.topic}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>
                  {finishNextSession.subtopic}
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                  📅 {fmtLessonCompleteDate(finishNextSession.scheduled_date)}
                </p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  background: "#189080",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Back to Dashboard →
              </button>
              {finishNextSession && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(finishNextSession.topic)}`,
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: 12,
                    background: "white",
                    color: "#189080",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "1.5px solid #189080",
                    cursor: "pointer",
                  }}
                >
                  Start next session now →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
