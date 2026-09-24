import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const id = parseInt(productId, 10);
  if (!Number.isInteger(id)) return new NextResponse("Not found", { status: 404 });

  const product = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!product?.imageUrl?.startsWith("data:image/")) {
    return new NextResponse("No image", { status: 404 });
  }

  const [meta, base64] = product.imageUrl.split(",");
  const mimeType = meta.replace("data:", "").replace(";base64", "");
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: { "Content-Type": mimeType, "Cache-Control": "public, max-age=86400" },
  });
}