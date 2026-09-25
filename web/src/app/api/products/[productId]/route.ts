import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/http";

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

  return NextResponse.json({
    ...serializeProduct(product),
    image_url: product.imageUrl?.startsWith("data:image/")
      ? `/api/products/${product.id}/image`
      : product.imageUrl,
  });
}
