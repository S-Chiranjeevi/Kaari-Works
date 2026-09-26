import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, integer, serializeProduct, text } from "@/lib/http";

function resolveProductImages(productId: number, rawImageUrl: string | null): { images: string[]; imageUrl: string | null } {
  if (!rawImageUrl) return { images: [], imageUrl: null };
  if (rawImageUrl.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawImageUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const images = parsed.map((img: string, i: number) =>
          img.startsWith("data:image/") ? `/api/products/${productId}/image?index=${i}` : img
        );
        return { images, imageUrl: images[0] || null };
      }
    } catch {
      // fall through
    }
  }
  const single = rawImageUrl.startsWith("data:image/") ? `/api/products/${productId}/image` : rawImageUrl;
  return { images: [single], imageUrl: single };
}

// GET /api/products/[productId] — single product detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const id = parseInt(productId, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ detail: "Not found." }, { status: 404 });

  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: { select: { displayName: true } } },
  });
  if (!product) return NextResponse.json({ detail: "Product not found." }, { status: 404 });

  const { images, imageUrl } = resolveProductImages(product.id, product.imageUrl);

  return NextResponse.json({
    ...serializeProduct(product),
    images,
    image_url: imageUrl,
  });
}

// PATCH /api/products/[productId] — edit seller's product details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ detail: "Sign in to update this product." }, { status: 401 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);
    if (!Number.isInteger(id)) return NextResponse.json({ detail: "Invalid product ID." }, { status: 400 });

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ detail: "Product not found." }, { status: 404 });
    if (existing.sellerId !== userId) {
      return NextResponse.json({ detail: "You can only edit your own products." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      updateData.name = text(body.name, 180);
    }
    if (typeof body.category === "string" && body.category.trim().length >= 2) {
      updateData.category = text(body.category, 100);
    }
    if (typeof body.description === "string") {
      updateData.description = text(body.description, 5000);
    }
    if (body.price_inr !== undefined) {
      const price = integer(body.price_inr, 1);
      if (price > 0) updateData.priceInr = price;
    }
    if (body.making_cost_inr !== undefined) {
      updateData.makingCostInr = body.making_cost_inr == null ? null : integer(body.making_cost_inr, 0);
    }
    if (body.hours_to_make !== undefined) {
      updateData.hoursToMake = Number.isFinite(Number(body.hours_to_make)) ? Number(body.hours_to_make) : null;
    }
    if (body.craft_experience_years !== undefined) {
      updateData.craftExperienceYears = body.craft_experience_years == null ? null : integer(body.craft_experience_years, 0);
    }
    if (body.quantity_available !== undefined) {
      updateData.quantityAvailable = integer(body.quantity_available, 0);
    }
    if (body.minimum_order_quantity !== undefined) {
      updateData.minimumOrderQuantity = integer(body.minimum_order_quantity, 1, 1);
    }
    if (body.lead_time !== undefined) {
      updateData.leadTime = text(body.lead_time, 120) || null;
    }
    if (Array.isArray(body.images) && body.images.length > 0) {
      updateData.imageUrl = JSON.stringify(body.images.slice(0, 15));
    } else if (typeof body.image_url === "string" && body.image_url.trim()) {
      updateData.imageUrl = body.image_url.trim();
    }
    if (body.status === "published" || body.status === "draft") {
      updateData.status = body.status;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { seller: { select: { displayName: true } } },
    });

    const { images, imageUrl } = resolveProductImages(updated.id, updated.imageUrl);
    return NextResponse.json({
      ...serializeProduct(updated),
      images,
      image_url: imageUrl,
    });
  } catch (error) {
    return errorResponse(error, "Unable to update product details.");
  }
}

// DELETE /api/products/[productId] — delete seller's product
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ detail: "Sign in to delete this product." }, { status: 401 });
    }

    const { productId } = await params;
    const id = parseInt(productId, 10);
    if (!Number.isInteger(id)) return NextResponse.json({ detail: "Invalid product ID." }, { status: 400 });

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ detail: "Product not found." }, { status: 404 });
    if (existing.sellerId !== userId) {
      return NextResponse.json({ detail: "You can only delete your own products." }, { status: 403 });
    }

    // Safely remove dependencies before deleting product
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.orderItem.deleteMany({ where: { productId: id } });
    await prisma.inquiry.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Product "${existing.name}" deleted successfully.`,
      productId: id,
    });
  } catch (error) {
    return errorResponse(error, "Unable to delete product.");
  }
}
