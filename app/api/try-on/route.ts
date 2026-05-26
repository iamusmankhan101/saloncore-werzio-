import { NextRequest } from "next/server";

export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Gemini API key not configured on server." }, { status: 500 });
  }

  const body = await request.json() as { imageBase64: string; prompt: string };
  const { imageBase64, prompt } = body;

  if (!imageBase64 || !prompt) {
    return Response.json({ error: "Image and prompt are required." }, { status: 400 });
  }

  const startTime = Date.now();

  // Strip data URI prefix, keep raw base64
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const instruction = buildInstruction(prompt);
  console.log("🎨 Gemini instruction:", instruction);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: instruction },
          ],
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
      signal: AbortSignal.timeout(55000),
    });

    const raw = await res.text();
    console.log("📡 Gemini status:", res.status, raw.slice(0, 300));

    if (!res.ok) {
      let detail = raw;
      try { detail = JSON.parse(raw)?.error?.message ?? raw; } catch { /* keep raw */ }
      return Response.json({ error: `Gemini error: ${detail}` }, { status: res.status });
    }

    const data = JSON.parse(raw) as {
      candidates?: Array<{
        content?: {
          parts?: Array<
            | { text: string }
            | { inlineData: { mimeType: string; data: string } }
          >;
        };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p): p is { inlineData: { mimeType: string; data: string } } => "inlineData" in p,
    );

    if (!imagePart) {
      console.error("No image in Gemini response:", JSON.stringify(data).slice(0, 500));
      return Response.json({ error: "Gemini returned no image. Try rephrasing the prompt." }, { status: 500 });
    }

    const outputBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    const predictTime = (Date.now() - startTime) / 1000;
    console.log("🎉 Done in", predictTime, "s");

    return Response.json({
      predictionId: `gemini-${Date.now()}`,
      output: outputBase64,
      status: "succeeded",
      predictTime,
      provider: "gemini",
    });
  } catch (error) {
    const msg = error instanceof Error
      ? (error.name === "AbortError" ? "Request timed out — try again." : error.message)
      : "Unknown error";
    console.error("❌ Gemini error:", error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

function buildInstruction(prompt: string): string {
  // Keep the prompt focused — strip wrapper phrases the model doesn't need
  return prompt
    .replace(/to the woman in the uploaded image,?\s*/gi, "")
    .replace(/virtual try-?on/gi, "")
    .replace(/salon(-quality)?\s*/gi, "")
    .replace(/seamless\s*/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/[,\s]+$/, "")
    .trim();
}

export async function GET() {
  return Response.json({ status: "succeeded", output: null, error: null, predictTime: null });
}