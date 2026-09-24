import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Turn = { role: "user" | "model"; text: string };

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ detail: "The Kaari buyer guide needs GEMINI_API_KEY configured on the server." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1200) : "";
  if (!message) return NextResponse.json({ detail: "Ask about a craft, its estimated making time or fair cost." }, { status: 422 });
  const history: Turn[] = Array.isArray(body?.history)
    ? body.history.slice(-8).filter((turn: unknown): turn is Turn =>
      !!turn && typeof turn === "object" && ["user", "model"].includes((turn as Turn).role) &&
      typeof (turn as Turn).text === "string" && (turn as Turn).text.length <= 1200)
    : [];

  let listingContext = "No specific Kaari Works product listing was supplied.";
  const suppliedListing = body?.listing;
  if (suppliedListing && typeof suppliedListing === "object" && typeof suppliedListing.name === "string") {
    listingContext = JSON.stringify({
      name: suppliedListing.name.slice(0, 180),
      category: typeof suppliedListing.category === "string" ? suppliedListing.category.slice(0, 100) : "",
      description: typeof suppliedListing.description === "string" ? suppliedListing.description.slice(0, 1800) : "",
      asking_price_inr: suppliedListing.price_inr != null && Number.isFinite(Number(suppliedListing.price_inr)) ? Number(suppliedListing.price_inr) : null,
      claimed_making_cost_inr: suppliedListing.making_cost_inr != null && Number.isFinite(Number(suppliedListing.making_cost_inr)) ? Number(suppliedListing.making_cost_inr) : null,
      claimed_hours_to_make: suppliedListing.hours_to_make != null && Number.isFinite(Number(suppliedListing.hours_to_make)) ? Number(suppliedListing.hours_to_make) : null,
      craft_experience_years: suppliedListing.craft_experience_years != null && Number.isFinite(Number(suppliedListing.craft_experience_years)) ? Number(suppliedListing.craft_experience_years) : null,
      claimed_lead_time: typeof suppliedListing.lead_time === "string" ? suppliedListing.lead_time.slice(0, 120) : null,
    });
  }
  const productId = Number(body?.product_id);
  if (Number.isInteger(productId) && productId > 0) {
    try {
      const product = await prisma.product.findFirst({
        where: { id: productId, status: "published" },
        select: { name: true, category: true, description: true, materials: true, priceInr: true, makingCostInr: true, hoursToMake: true, craftExperienceYears: true, leadTime: true },
      });
      if (product) listingContext = JSON.stringify(product);
    } catch {
      // Keep the guide usable when preview mode has no database connected.
    }
  }

  const systemPrompt = [
    "You are Kaari Works' buyer-side craft estimate guide.",
    "Help buyers understand plausible making-time and production-cost ranges for handmade goods, and compare those ranges with seller-provided details when present.",
    "Use INR unless the user asks otherwise. State key assumptions and uncertainty; ranges are better than false precision. Consider materials, dimensions, complexity, handwork, batch quantity, artisan experience, and region only when supplied or commonly relevant.",
    "If details are insufficient, ask one concise follow-up or clearly list assumptions. Do not invent verified market data, citations, or exact benchmarks.",
    "Compare estimates with any seller-stated cost, hours, or lead time and explain where they overlap or differ. A mismatch is a reason for the buyer to ask the seller for clarification, never proof of dishonesty. Never claim to verify a seller's reliability or authenticity.",
    "Keep the reply concise, practical, respectful of artisan labour, and useful for a bulk buyer. Explain that all figures are indicative estimates, not a guarantee.",
    "Product listing context (seller-supplied and unverified): " + listingContext,
  ].join("\n");

  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...history.map(({ role, text }) => ({ role, parts: [{ text }] })), { role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini buyer guide failed", response.status, result?.error?.message);
      return NextResponse.json({ detail: "The buyer guide could not respond. Check Gemini model access and try again." }, { status: 502 });
    }
    const reply = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!reply) return NextResponse.json({ detail: "Gemini returned an empty reply. Please try again." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Gemini buyer guide request failed", error);
    return NextResponse.json({ detail: "The buyer guide is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
