import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

// Poll a Replicate prediction URL until succeeded/failed.
async function pollReplicate(predictionUrl: string, token: string): Promise<string> {
  const deadline = Date.now() + 50_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(predictionUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (data.status === "succeeded") {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      if (typeof output === "string") return output;
      throw new Error("Replicate returned no image URL");
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error ?? "Replicate prediction failed");
    }
  }
  throw new Error("Replicate prediction timed out after 50s");
}

async function replicatePredict(
  model: string,
  input: Record<string, unknown>,
  token: string
): Promise<string> {
  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=10",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ input }),
  });
  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction?.detail ?? `Replicate error ${res.status}`);

  if (prediction.status === "succeeded") {
    const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (typeof output === "string") return output;
    throw new Error("No output URL in succeeded prediction");
  }
  if (prediction.urls?.get) return pollReplicate(prediction.urls.get, token);
  throw new Error("No polling URL returned");
}

export async function POST(request: NextRequest) {
  if (process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ detail: "Sign in to enhance a product photo." }, { status: 401 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken)
    return NextResponse.json(
      { detail: "Add REPLICATE_API_TOKEN to web/.env.local to enable image enhancement." },
      { status: 503 }
    );

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(image);
  if (!match) return NextResponse.json({ detail: "Upload a JPEG, PNG, or WebP image." }, { status: 422 });
  if (match[2].length > 1_500_000)
    return NextResponse.json({ detail: "Choose an image smaller than 1 MB." }, { status: 413 });

  // ── Attempt 1: Real-ESRGAN upscale/enhance ────────────────────────────────
  try {
    const outputUrl = await replicatePredict(
      "nightmareai/real-esrgan",
      { image, scale: 2, face_enhance: false },
      replicateToken
    );
    const imgRes = await fetch(outputUrl, { signal: AbortSignal.timeout(20_000) });
    if (!imgRes.ok) throw new Error("Failed to download enhanced image");
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/png";
    return NextResponse.json({ image: `data:${contentType};base64,${buffer.toString("base64")}` });
  } catch (err) {
    console.warn("Real-ESRGAN failed, falling back to background removal:", err);
  }

  // ── Fallback: Remove background + composite onto clean backdrop ───────────
  try {
    const cutoutUrl = await replicatePredict(
      "lucataco/remove-bg",
      { image },
      replicateToken
    );
    const cutoutRes = await fetch(cutoutUrl, { signal: AbortSignal.timeout(20_000) });
    if (!cutoutRes.ok) throw new Error("Failed to download cutout image");
    const cutoutBuffer = Buffer.from(await cutoutRes.arrayBuffer());

    const meta = await sharp(cutoutBuffer).metadata();
    const w = meta.width ?? 800;
    const h = meta.height ?? 800;

    // Warm linen background — clean and neutral for craft listings
    const background = await sharp({
      create: { width: w, height: h, channels: 3, background: { r: 245, g: 240, b: 232 } },
    })
      .png()
      .toBuffer();

    const composited = await sharp(background)
      .composite([{ input: cutoutBuffer, blend: "over" }])
      .jpeg({ quality: 92 })
      .toBuffer();

    return NextResponse.json({ image: `data:image/jpeg;base64,${composited.toString("base64")}` });
  } catch (err) {
    console.error("Background removal also failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { detail: `Image enhancement failed: ${message}` },
      { status: 502 }
    );
  }
}
