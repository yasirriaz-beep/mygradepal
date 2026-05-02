import { NextResponse } from "next/server";

/**
 * Paid Google Cloud TTS — intended only for tutor **chat** replies (`sendMessage` in tutor page).
 * Explain-step Listen uses `topic_content.audio_url_en` or browser `speechSynthesis`, not this route.
 */
export async function POST(request: Request) {
  console.log("[tts] CALLED - costs money - caller should only be chat");

  const source = request.headers.get("X-TTS-Source");
  if (source !== "tutor-chat") {
    console.warn("[tts] Rejected: expected X-TTS-Source: tutor-chat (paid route — tutor chat only)");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { text } = await request.json();
  if (!text) return NextResponse.json({ error: "No text" }, { status: 400 });

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No TTS key" }, { status: 500 });

  const truncated = String(text).slice(0, 500);

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: truncated },
        voice: {
          languageCode: "en-GB",
          name: "en-GB-Neural2-B",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.9,
        },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }

  const data = await response.json();
  const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
  return NextResponse.json({ audioUrl });
}
