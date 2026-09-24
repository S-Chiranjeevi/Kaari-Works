import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, integer, serializeProduct, text } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = text(request.nextUrl.searchParams.get("q"), 100);
  const category = text(request.nextUrl.searchParams.get("category"), 100);
  const products = await prisma.product.findMany({
    where: {
      status: "published",
      ...(category ? { category } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { materials: { contains: search, mode: "insensitive" } },
      ] } : {}),
    },
    include: { seller: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json(products.map((product) => ({
    ...serializeProduct(product),
    image_url: product.imageUrl?.startsWith("data:image/") ? `/api/products/${product.id}/image` : product.imageUrl,
  })));
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to publish a listing." }, { status: 401 });
    const body = await request.json();
    const name = text(body.name, 180);
    const category = text(body.category, 100);
    const description = text(body.description, 5000);
    const priceInr = integer(body.price_inr, 0, 1);
    const minimumOrderQuantity = integer(body.minimum_order_quantity, 1, 1);
    if (name.length < 2 || category.length < 2 || priceInr < 1) {
      return NextResponse.json({ detail: "Add a product name, category, and positive price." }, { status: 422 });
    }
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const displayName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || null;
    await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, displayName, email, role: "seller" },
      update: { displayName, email, role: "seller" },
    });
    const product = await prisma.product.create({
      data: {
        sellerId: userId, name, category, description,
        materials: text(body.materials, 300) || null,
        priceInr, makingCostInr: body.making_cost_inr == null ? null : integer(body.making_cost_inr, 0),
        hoursToMake: Number.isFinite(Number(body.hours_to_make)) ? Number(body.hours_to_make) : null,
        craftExperienceYears: body.craft_experience_years == null ? null : integer(body.craft_experience_years, 0),
        quantityAvailable: integer(body.quantity_available, 1), minimumOrderQuantity,
        leadTime: text(body.lead_time, 120) || null,
        imageUrl: typeof body.image_url === "string" && body.image_url.length <= 4_000_000 ? body.image_url : null,
        status: body.status === "draft" ? "draft" : "published",
      },
      include: { seller: { select: { displayName: true } } },
    });
    return NextResponse.json({
      ...serializeProduct(product),
      image_url: product.imageUrl?.startsWith("data:image/") ? `/api/products/${product.id}/image` : product.imageUrl,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to publish the product.");
  }
}
