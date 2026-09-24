import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const id = Number(productId);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ detail: "Image not found." }, { status: 404 });
  const product = await prisma.product.findFirst({ where: { id, status: "published" }, select: { imageUrl: true } });
  const match = product?.imageUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/);
  if (!match) return NextResponse.json({ detail: "Image not found." }, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
  });
}
