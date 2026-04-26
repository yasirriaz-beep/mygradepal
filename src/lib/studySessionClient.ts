"use client";

export type SessionRequirements = {
  minDurationMinutes: number;
  minQuestions: number;
  assignedTopic: string;
  startTime: string;
  endTime: string;
};

export type SessionStatusResponse = {
  sessionId: string | null;
  complete: boolean;
  shouldLock: boolean;
  inWindow: boolean;
  studentName: string;
  requirements: SessionRequirements;
  progress: {
    durationMinutes: number;
    questionsAttempted: number;
    questionsCorrect: number;
  };
};

type StartPayload = {
  studentId: string;
  source?: "practice" | "tutor" | "check";
  topic?: string;
};

export async function startSession(payload: StartPayload): Promise<SessionStatusResponse> {
  const response = await fetch("/api/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Unable to start session.");
  }
  return (await response.json()) as SessionStatusResponse;
}

type UpdatePayload = {
  sessionId: string;
  studentId: string;
  incrementMinutes?: number;
};

export async function updateSession(payload: UpdatePayload) {
  try {
    const response = await fetch("/api/session/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn("Session update failed silently:", response.status);
      return { complete: false };
    }
    return (await response.json()) as {
      complete: boolean;
      message: string;
      durationMinutes: number;
      questionsAttempted: number;
    };
  } catch {
    return { complete: false };
  }
}
