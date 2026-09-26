import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/http";

// GET /api/products/draft — fetch the signed-in seller's active draft
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ draft: null }, { status: 200 });
    }

    const draft = await prisma.product.findFirst({
      where: { sellerId: userId, status: "draft" },
      orderBy: { updatedAt: "desc" },
    });

    if (!draft) {
      return NextResponse.json({ draft: null }, { status: 200 });
    }

    let images: string[] = [];
    if (draft.imageUrl) {
      if (draft.imageUrl.startsWith("[")) {
        try {
          const parsed = JSON.parse(draft.imageUrl);
          if (Array.isArray(parsed)) images = parsed;
        } catch {
          images = [draft.imageUrl];
        }
      } else {
        images = [draft.imageUrl];
      }
    }

    return NextResponse.json({
      draft: {
        id: draft.id,
        name: draft.name === "Untitled Draft" ? "" : draft.name,
        category: draft.category,
        description: draft.description,
        price: draft.priceInr > 0 ? String(draft.priceInr) : "",
        cost: draft.makingCostInr != null ? String(draft.makingCostInr) : "",
        hours: draft.hoursToMake != null ? String(draft.hoursToMake) : "",
        experience: draft.craftExperienceYears != null ? String(draft.craftExperienceYears) : "",
        quantity: String(draft.quantityAvailable || 20),
        minimum: String(draft.minimumOrderQuantity || 5),
        leadTime: draft.leadTime || "",
        image: images[0] || "",
        images,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error, "Could not load draft.");
  }
}

// POST /api/products/draft — save or update seller's draft
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ detail: "Please sign in to save your draft." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const displayName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || null;

    await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, displayName, email, role: "seller" },
      update: { displayName, email, role: "seller" },
    });

    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 180) : "Untitled Draft";
    const category = typeof body.category === "string" && body.category.trim() ? body.category.trim().slice(0, 100) : "Textiles";
    const description = typeof body.description === "string" ? body.description.slice(0, 5000) : "";
    const priceInr = Number.isInteger(Number(body.price)) && Number(body.price) > 0 ? Number(body.price) : 0;
    const makingCostInr = Number.isInteger(Number(body.cost)) && Number(body.cost) >= 0 ? Number(body.cost) : null;
    const hoursToMake = Number.isFinite(Number(body.hours)) && Number(body.hours) >= 0 ? Number(body.hours) : null;
    const craftExperienceYears = Number.isInteger(Number(body.experience)) && Number(body.experience) >= 0 ? Number(body.experience) : null;
    const quantityAvailable = Number.isInteger(Number(body.quantity)) && Number(body.quantity) >= 0 ? Number(body.quantity) : 20;
    const minimumOrderQuantity = Number.isInteger(Number(body.minimum)) && Number(body.minimum) >= 1 ? Number(body.minimum) : 5;
    const leadTime = typeof body.leadTime === "string" && body.leadTime.trim() ? body.leadTime.trim().slice(0, 120) : null;

    let storedImageUrl: string | null = null;
    if (Array.isArray(body.images) && body.images.length > 0) {
      storedImageUrl = JSON.stringify(body.images.slice(0, 15));
    } else if (typeof body.image === "string" && body.image.trim()) {
      storedImageUrl = body.image.trim();
    }

    const existingDraft = await prisma.product.findFirst({
      where: { sellerId: userId, status: "draft" },
      orderBy: { updatedAt: "desc" },
    });

    let draft;
    if (existingDraft) {
      draft = await prisma.product.update({
        where: { id: existingDraft.id },
        data: {
          name, category, description,
          priceInr, makingCostInr, hoursToMake,
          craftExperienceYears, quantityAvailable, minimumOrderQuantity,
          leadTime, imageUrl: storedImageUrl,
          status: "draft",
        },
      });
    } else {
      draft = await prisma.product.create({
        data: {
          sellerId: userId, name, category, description,
          priceInr, makingCostInr, hoursToMake,
          craftExperienceYears, quantityAvailable, minimumOrderQuantity,
          leadTime, imageUrl: storedImageUrl,
          status: "draft",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      draftId: draft.id,
      updatedAt: draft.updatedAt,
      message: "Draft saved successfully.",
    });
  } catch (error) {
    return errorResponse(error, "Could not save draft.");
  }
}

// DELETE /api/products/draft — discard seller's draft
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: true });
    }

    await prisma.product.deleteMany({
      where: { sellerId: userId, status: "draft" },
    });

    return NextResponse.json({ ok: true, message: "Draft deleted." });
  } catch (error) {
    return errorResponse(error, "Could not discard draft.");
  }
}
