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

    // Step 2 - Generate image with Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create a clean, simple scientific diagram for a Cambridge IGCSE Chemistry exam question.

Diagram description: ${diagramDescription}

Style requirements:
- White background
- Clean black lines
- Simple and clear like a textbook diagram
- Label all parts clearly
- No decorative elements
- Suitable for a student exam paper`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
            responseMimeType: "image/png",
          },
        }),
      }
    );

    const geminiData = (await geminiResponse.json()) as {
      candidates: Array<{
        content: {
          parts: Array<{
            inlineData?: { data: string; mimeType: string };
          }>;
        };
      }>;
    };

    const imageData = geminiData.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
      ?.inlineData;

    if (!imageData) {
      return NextResponse.json({ error: "Gemini did not return an image" }, { status: 500 });
    }

    // Step 3 - Upload to Supabase Storage
    const imageBuffer = Buffer.from(imageData.data, "base64");
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
