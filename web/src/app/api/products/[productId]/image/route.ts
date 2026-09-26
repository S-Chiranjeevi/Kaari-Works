import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const id = parseInt(productId, 10);
  if (!Number.isInteger(id)) return new NextResponse("Not found", { status: 404 });

  const product = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!product?.imageUrl) {
    return new NextResponse("No image", { status: 404 });
  }

  let targetUrl = product.imageUrl;
  if (product.imageUrl.startsWith("[")) {
    try {
      const parsed = JSON.parse(product.imageUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const idx = parseInt(request.nextUrl.searchParams.get("index") || "0", 10) || 0;
        targetUrl = parsed[idx] || parsed[0] || "";
      }
    } catch {
      targetUrl = product.imageUrl;
    }
  }

  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    return NextResponse.redirect(targetUrl);
  }

  if (!targetUrl.startsWith("data:image/")) {
    return new NextResponse("No image", { status: 404 });
  }

  const [meta, base64] = targetUrl.split(",");
  if (!meta || !base64) return new NextResponse("Invalid image", { status: 400 });

  const mimeType = meta.replace("data:", "").replace(";base64", "");
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: { "Content-Type": mimeType, "Cache-Control": "public, max-age=86400" },
  });
}
