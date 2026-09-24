import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to enhance a product photo." }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ detail: "Add your new GEMINI_API_KEY to web/.env.local to enable image enhancement." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(image);
  if (!match) return NextResponse.json({ detail: "Upload a JPEG, PNG, or WebP image." }, { status: 422 });
  if (match[2].length > 1_500_000) return NextResponse.json({ detail: "Choose an image smaller than 1 MB." }, { status: 413 });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
        input: [
          { type: "image", mime_type: match[1], data: match[2] },
          { type: "text", text: "Enhance this exact handmade product photograph for an honest artisan marketplace listing. Improve exposure, white balance, sharpness, and background cleanliness with natural soft studio lighting. Preserve the product exactly: do not alter its shape, materials, colors, patterns, details, size, or craftsmanship; do not add props, text, labels, logos, or invented details. Center the entire product on a simple neutral background. Return only the edited image." },
        ],
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error("Gemini image edit failed", response.status, payload?.error?.message);
      return NextResponse.json({ detail: "Gemini could not enhance that image. Check your API key, model access, and try again." }, { status: 502 });
    }
    const output = payload.steps?.flatMap((step: { content?: Array<{ type?: string; mime_type?: string; data?: string }> }) => step.content ?? []).find((item: { type?: string; data?: string }) => item.type === "image" && item.data);
    if (!output?.data) return NextResponse.json({ detail: "Gemini returned no edited image. Try another product photo." }, { status: 502 });
    return NextResponse.json({ image: "data:" + (output.mime_type || "image/png") + ";base64," + output.data });
  } catch (error) {
    console.error("Gemini image edit request failed", error);
    return NextResponse.json({ detail: "Image enhancement failed. Please try again." }, { status: 502 });
  }
}
