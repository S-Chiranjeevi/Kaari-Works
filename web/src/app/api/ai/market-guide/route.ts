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

  const lang = typeof body?.lang === "string" ? body.lang : "en";
  const langNames: Record<string, string> = { en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu" };
  const replyLang = langNames[lang] ?? "English";

  const systemPrompt = [
    "You are a friendly helper for Kaari Works, an Indian artisan marketplace.",
    "You help artisans and village craftspeople understand fair prices for their handmade goods.",
    `LANGUAGE: Always reply in ${replyLang}. If the user writes in any language, still reply in ${replyLang}.`,
    "TONE: Simple, warm, and encouraging. Write like you are talking to a village artisan who may not be familiar with business terms. Use plain everyday language. Avoid jargon.",
    "LENGTH: Keep replies short — 3 to 5 sentences maximum. Use bullet points only when listing 3 or more items. Never write long paragraphs.",
    "CONTENT: Give a simple price range in ₹. Explain briefly what affects the price (materials, time, skill). If the seller has shared their details, compare gently and encouragingly.",
    "Always remind that these are rough estimates, not guaranteed prices. The artisan always decides their own price.",
    "Never use terms like 'overhead', 'margin', 'benchmarks', 'indicative', or 'INR' — say ₹ instead.",
    "Product listing context (seller-supplied and unverified): " + listingContext,
  ].join("\n");

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...history.map(({ role, text }) => ({ role, parts: [{ text }] })), { role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini buyer guide failed", response.status, result?.error?.message);
      return NextResponse.json({ detail: `The buyer guide could not respond: ${result?.error?.message || "Check Gemini model access and try again."}` }, { status: 502 });
    }
    const reply = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!reply) return NextResponse.json({ detail: "Gemini returned an empty reply. Please try again." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Gemini buyer guide request failed", error);
    return NextResponse.json({ detail: "The buyer guide is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
