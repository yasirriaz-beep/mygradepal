import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { questionId, questionText } = (await req.json()) as {
      questionId: string;
      questionText: string;
    };

    // Step 1 - Ask Claude to extract diagram description
    const descResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `This Cambridge IGCSE Chemistry question references a diagram:

"${questionText}"

Write a precise description of exactly what the diagram should show so a scientific illustrator could draw it. Be specific about:
- What type of diagram (particle arrangement, apparatus, graph, etc.)
- Exact labels needed
- What each part shows
- Any specific values or measurements

Keep it under 100 words. Output only the description, nothing else.`,
          },
        ],
      }),
    });

    const descData = (await descResponse.json()) as { content: Array<{ text: string }> };
    const diagramDescription = descData.content[0]?.text ?? "";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{
            prompt: `A clean, simple scientific diagram for a Cambridge IGCSE Chemistry exam question. White background, black lines, textbook style, clearly labelled. ${diagramDescription}`
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
          }
        })
      }
    );

    const geminiData = await geminiResponse.json() as {
      predictions?: Array<{
        bytesBase64Encoded?: string;
        mimeType?: string;
      }>
    };

    const imageData = geminiData.predictions?.[0];

    if (!imageData?.bytesBase64Encoded) {
      console.error("Gemini response:", JSON.stringify(geminiData).slice(0, 300));
      return NextResponse.json({ error: "Gemini did not return an image" }, { status: 500 });
    }

    const imageBuffer = Buffer.from(imageData.bytesBase64Encoded, "base64");

    // Step 3 - Upload to Supabase Storage
    const fileName = `diagrams/${questionId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("question-diagrams")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Step 4 - Get public URL
    const { data: urlData } = supabase.storage.from("question-diagrams").getPublicUrl(fileName);

    const diagramUrl = urlData.publicUrl;

    // Step 5 - Update question record
    await supabase
      .from("questions")
      .update({
        diagram_url: diagramUrl,
        diagram_description: diagramDescription,
      })
      .eq("id", questionId);

    return NextResponse.json({ success: true, diagramUrl, diagramDescription });
  } catch (err) {
    console.error("Diagram generation error:", err);
    return NextResponse.json({ error: "Failed to generate diagram" }, { status: 500 });
  }
}
