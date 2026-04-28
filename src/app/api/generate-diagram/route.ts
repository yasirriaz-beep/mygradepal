import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { questionId, questionText } = await req.json() as {
      questionId: string;
      questionText: string;
    };

    // Step 1 — Get diagram description from Claude
    const descResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `This Cambridge IGCSE Chemistry question references a diagram: "${questionText}". Describe in 50 words exactly what the diagram shows so it can be drawn. Be specific about labels, shapes, and layout. Output only the description.`
        }]
      })
    });

    const descData = await descResponse.json() as {
      content: Array<{ type: string; text: string }>
    };
    const diagramDescription = descData.content?.[0]?.text ?? "scientific chemistry diagram";

    // Step 2 — Generate image with Imagen
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{
            prompt: `Clean simple scientific diagram for Cambridge IGCSE Chemistry. White background, black lines, textbook style, all parts clearly labelled. ${diagramDescription}`
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
          }
        })
      }
    );

    const geminiText = await geminiResponse.text();
    console.log("Gemini status:", geminiResponse.status, "response:", geminiText.slice(0, 300));

    let b64 = "";
    try {
      const geminiData = JSON.parse(geminiText) as {
        predictions?: Array<{ bytesBase64Encoded?: string }>
      };
      b64 = geminiData.predictions?.[0]?.bytesBase64Encoded ?? "";
    } catch {
      return NextResponse.json({ error: "Gemini parse error: " + geminiText.slice(0, 100) }, { status: 500 });
    }

    if (!b64) {
      return NextResponse.json({ error: "Gemini returned no image. Status: " + geminiResponse.status }, { status: 500 });
    }

    // Step 3 — Upload to Supabase Storage
    const imageBytes = Buffer.from(b64, "base64");
    const fileName   = `diagrams/${questionId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("question-diagrams")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("question-diagrams")
      .getPublicUrl(fileName);

    // Step 4 — Update question record
    await supabase
      .from("questions")
      .update({ diagram_url: urlData.publicUrl })
      .eq("id", questionId);

    return NextResponse.json({ success: true, diagramUrl: urlData.publicUrl });

  } catch (error) {
    console.error("Diagram generation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
