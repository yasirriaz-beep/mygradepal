import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
