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
  const langNames: Record<string, string> = { en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada" };
  const replyLang = langNames[lang] ?? "English";

  const systemPrompt = [
    "You are Kaari Guide, a warm, knowledgeable AI helper for Kaari Works, an Indian artisan marketplace.",
    "You help buyers and artisans understand the craftsmanship, fair making costs, and time required for handmade items.",
    `LANGUAGE: Always reply in ${replyLang}. If the user writes in any language, still reply in ${replyLang}.`,
    "TONE: Warm, conversational, respectful, easy to listen to when read aloud.",
    "FORMAT RULES — STRICTLY FOLLOW:",
    "- Reply in 2 to 3 plain spoken sentences ONLY.",
    "- NEVER use bullet points, numbered lists, asterisks, or dashes.",
    "- NEVER use markdown bold (**text**) or symbols because this text will be read aloud via voice synthesis.",
    "- Clearly state what the product is, its estimated raw material and making cost range in ₹, and the estimated time (hours or days) needed to make it.",
    "- Conclude with a warm note that the artisan values their unique skill, size, and tradition in the final price.",
    "GOOD example: 'For this handmade Clay Pot, the estimated raw material and making cost is around ₹80 to ₹200, and it typically takes 4 to 8 hours of shaping and kiln baking to complete. The artisan sets their fair selling price based on their personal craft and effort.'",
    "Product listing context: " + listingContext,
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
      // If rate limited, retry once after the suggested wait time (capped at 30s)
      if (response.status === 429) {
        const retryMatch = result?.error?.message?.match(/retry in ([\d.]+)s/i);
        const waitMs = Math.min((parseFloat(retryMatch?.[1] ?? "5") + 1) * 1000, 30_000);
        await new Promise((r) => setTimeout(r, waitMs));
        const retry = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [...history.map(({ role, text }) => ({ role, parts: [{ text }] })), { role: "user", parts: [{ text: message }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
          }),
        });
        const retryResult = await retry.json();
        if (!retry.ok) {
          return NextResponse.json({ detail: `The buyer guide is busy. Please try again in a moment.` }, { status: 503 });
        }
        const retryReply = retryResult.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim()
          .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^[\*\-]\s+/gm, "").replace(/^\d+\.\s+/gm, "").replace(/\n{3,}/g, "\n\n").trim();
        if (!retryReply) return NextResponse.json({ detail: "Gemini returned an empty reply. Please try again." }, { status: 502 });
        return NextResponse.json({ reply: retryReply });
      }
      console.error("Gemini buyer guide failed", response.status, result?.error?.message);
      return NextResponse.json({ detail: `The buyer guide could not respond: ${result?.error?.message || "Check Gemini model access and try again."}` }, { status: 502 });
    }
    const reply = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim()
      .replace(/\*\*(.*?)\*\*/g, "$1")   // remove **bold**
      .replace(/\*(.*?)\*/g, "$1")        // remove *italic*
      .replace(/^[\*\-]\s+/gm, "")        // remove bullet points
      .replace(/^\d+\.\s+/gm, "")         // remove numbered lists
      .replace(/\n{3,}/g, "\n\n")         // collapse excess newlines
      .trim();
    if (!reply) return NextResponse.json({ detail: "Gemini returned an empty reply. Please try again." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Gemini buyer guide request failed", error);
    return NextResponse.json({ detail: "The buyer guide is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
