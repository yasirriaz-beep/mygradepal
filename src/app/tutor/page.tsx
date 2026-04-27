"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "@/components/BottomNav";
import FinishSession from "@/components/FinishSession";
import LearnContent from "@/components/LearnContent";
import { supabase } from "@/lib/supabase";
import { startSession as startStudySession, updateSession } from "@/lib/studySessionClient";
import { getTrialUsage, TRIAL_LIMITS } from "@/lib/trialLimits";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  audioUrl?: string | null;
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
  const [testScore, setTestScore] = useState({ correct: 0, total: 0 });
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [trialMessageLimitReached, setTrialMessageLimitReached] = useState(false);
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

  const runLessonAction = async (action: LessonStep) => {
    if (action === "past-paper") {
      router.push(`/practice?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}`);
      return;
    }

    setCurrentStep(action);
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
          </div>
        )}
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

      <button
        onClick={() => router.push(`/learn/${encodeURIComponent(subject)}`)}
        className="mt-3 w-full rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
      >
        Back to topics
      </button>

      <BottomNav />

      <Suspense fallback={null}>
        <FinishSession />
      </Suspense>
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
