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

    // Step 2 — Generate image with DALL-E 3
    const dalleResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: `A clean, simple scientific diagram for a Cambridge IGCSE Chemistry exam question. White background, black lines only, textbook style, all parts clearly labelled with text. No color. No shading. Simple line drawing. ${diagramDescription}`,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        })
      }
    );

    const dalleText = await dalleResponse.text();
    console.log("DALL-E status:", dalleResponse.status);

    let b64 = "";
    try {
      const dalleData = JSON.parse(dalleText) as {
        data?: Array<{ b64_json?: string }>;
        error?: { message: string };
      };

      if (dalleData.error) {
        return NextResponse.json({ 
          error: "DALL-E error: " + dalleData.error.message 
        }, { status: 500 });
      }

      b64 = dalleData.data?.[0]?.b64_json ?? "";
    } catch {
      return NextResponse.json({ 
        error: "Parse error: " + dalleText.slice(0, 200) 
      }, { status: 500 });
    }

    if (!b64) {
      return NextResponse.json({ 
        error: "DALL-E returned no image" 
      }, { status: 500 });
    }

    const imageBytes = Buffer.from(b64, "base64");

    // Step 3 — Upload to Supabase Storage
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
