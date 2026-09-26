import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/http";

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
    where: { id, status: "published" },
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
