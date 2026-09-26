import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_BYTES = 1_000_000;

export async function POST(request: NextRequest) {
  if (process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ detail: "Sign in to enhance a product photo." }, { status: 401 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { detail: "Add GEMINI_API_KEY to the server environment to enable image enhancement." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(image);
  if (!match) {
    return NextResponse.json({ detail: "Upload a JPEG, PNG, or WebP image." }, { status: 422 });
  }

  const inputBuffer = Buffer.from(match[2], "base64");
  if (!inputBuffer.length || inputBuffer.length > MAX_INPUT_BYTES) {
    return NextResponse.json({ detail: "Choose an image smaller than 1 MB." }, { status: 413 });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image")}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(55_000),
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Enhance this artisan product photograph for a handmade marketplace listing. Keep the exact product, shape, materials, colors, pattern, and all visible details unchanged. Improve sharpness, exposure, and natural lighting, and use a clean, subtle neutral background. Do not add, remove, or invent objects or product features. Return only the edited image.",
              },
              { inline_data: { mime_type: match[1], data: match[2] } },
            ],
          }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      const detail = result?.error?.message || `Gemini image request failed (${response.status}).`;
      console.error("Gemini image enhancement failed", response.status, detail);
      return NextResponse.json({ detail }, { status: response.status === 429 ? 503 : 502 });
    }

    const part = result.candidates?.[0]?.content?.parts?.find(
      (candidate: { inlineData?: { data?: string }; inline_data?: { data?: string } }) =>
        candidate.inlineData?.data || candidate.inline_data?.data
    );
    const imageData = part?.inlineData?.data || part?.inline_data?.data;
    if (typeof imageData !== "string") {
      return NextResponse.json(
        { detail: "Gemini did not return an edited image. Try another product photo." },
        { status: 502 }
      );
    }

    // Keep stored listing photos compact while preserving the enhanced result.
    const output = await sharp(Buffer.from(imageData, "base64"))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return NextResponse.json({ image: `data:image/jpeg;base64,${output.toString("base64")}` });
  } catch (error) {
    console.error("Gemini image enhancement request failed", error);
    return NextResponse.json(
      { detail: "Image enhancement is temporarily unavailable. Check the Gemini image model and try again." },
      { status: 502 }
    );
  }
}
